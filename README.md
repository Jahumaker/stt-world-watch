# STT World Watch — GitHub Pages Free -versio

Kevyt PWA-sovellus STT:n ulkomaisen uutisnäkyvyyden seurantaan. Käyttöliittymä on täysin staattinen ja toimii GitHub Pagesissa. Taustahaku ajetaan GitHub Actionsilla kerran tunnissa ja tulokset tallennetaan repositorion `data/articles.json`-tiedostoon.

Tämä versio on optimoitu **GitHub Free + julkinen repository + GitHub Pages** -käyttöön.

## Mitä tämä versio tekee

- näyttää STT:tä koskevat ulkomaiset uutisosumat
- niputtaa samankaltaiset otsikot yhteen syndikointiryhmään
- näyttää maat, uutistoimistot ja aikajanan
- merkitsee käyttäjän selaimessa vielä näkemättömät osumat `NEW`-merkinnällä
- asentuu puhelimeen PWA:na
- tekee automaattisen haun kerran tunnissa GitHub Actionsilla
- ajaa tuntihaun minuutilla **:17**, ei tasatunnilla
- **ei commitoi mitään eikä rakenna Pages-sivua uudelleen, jos uusia osumia ei löydy**
- tekee vain yhden kevyen heartbeat-commitin kuukaudessa, jotta julkisen repon scheduled workflow ei sammu pitkän passiivisuuden takia
- `Hae nyt` tekee selaimessa live-haun GDELT DOC API:sta (live-löydöt eivät tallennu yhteiseen historiaan ennen seuraavaa Actions-ajoa)
- Actionsissa on myös `workflow_dispatch`, joten ylläpitäjä voi ajaa pysyvän haun manuaalisesti GitHubin Actions-välilehdeltä

## Miksi tämä rakenne sopii ilmaiseen GitHub Pagesiin

GitHub Pages ei aja palvelinpuolen koodia. Siksi haku tehdään GitHub Actionsissa, joka päivittää JSON-tiedoston samaan repoon vain silloin, kun oikeasti löytyy uutta pysyvää dataa.

Normaali tuntiajo:

1. GitHub Actions käynnistyy minuutilla `:17`.
2. Python-skripti hakee ja suodattaa ehdokkaat.
3. Jos mitään uutta ei löydy, ajo päättyy ilman muutoksia repoon.
4. GitHub Pages ei rebuildaa sivua turhaan.
5. Jos uusia osumia löytyy, `articles.json` ja `status.json` päivittyvät ja yksi commit syntyy.

Näin 24 hakua vuorokaudessa ei tarkoita 24 Pages-buildia vuorokaudessa.

## Huomio "viimeisin tarkistus" -tietoon

Koska emme halua tehdä commitia joka tunti vain kellonajan päivittämiseksi, käyttöliittymä näyttää **VIIMEISIN DATAPÄIVITYS** -ajan. Se kertoo, milloin yhteiseen uutishistoriaan viimeksi tuli uutta dataa.

Jokaisen tuntihaun todellinen suoritus ja sen tulos näkyvät GitHubissa kohdassa:

**Actions → Update STT World Watch**

Ajon yhteenvedossa näkyvät tarkistettujen ehdokkaiden määrä, uusien relevanttien osumien määrä ja ajoaika.

## Kuukausittainen heartbeat

GitHub voi poistaa julkisen repon scheduled workflow'n käytöstä pitkän passiivisuuden jälkeen. Siksi workflow tekee kerran kuukaudessa pienen `data/heartbeat.txt`-päivityksen.

Se aiheuttaa korkeintaan yhden ylimääräisen Pages-buildin kuukaudessa, mutta auttaa pitämään tuntiseurannan käynnissä myös silloin, kun STT:stä ei pitkään aikaan löydy uusia juttuja.

## Asennus

1. Luo GitHubiin uusi **public** repository, esimerkiksi `stt-world-watch`.
2. Pura tämän paketin kaikki tiedostot repositorion juureen.
3. Commit + push `main`-haaraan.
4. Avaa GitHubissa **Settings → Pages**.
5. Valitse **Deploy from a branch** ja lähteeksi `main` + `/ (root)`.
6. Avaa **Settings → Actions → General → Workflow permissions** ja varmista, että workflow saa kirjoittaa repositoryyn (**Read and write permissions**), jos tilisi/repon asetukset sitä vaativat.
7. Avaa **Actions → Update STT World Watch → Run workflow** ja aja ensimmäinen haku käsin.
8. GitHub Pages -osoite on yleensä `https://KÄYTTÄJÄ.github.io/stt-world-watch/`.

Automaattinen tuntiajo käyttää cron-riviä:

```yaml
- cron: '17 * * * *'
```

GitHub ei takaa cron-ajolle sekunnintarkkaa aloitusaikaa. Ajo voi ruuhkassa käynnistyä hieman myöhemmin.

## Hae nyt -painike

Pages-sivun **Hae nyt** tekee GDELTistä live-haun suoraan käyttäjän selaimesta. Live-tulokset ovat tarkoituksella vain ehdokkaita: Pages-sivu ei voi turvallisesti kirjoittaa niitä GitHub-repoon ilman salaista GitHub-tokenia.

Pysyvä manuaalihaku tehdään GitHubissa:

**Actions → Update STT World Watch → Run workflow**.

Älä koskaan lisää GitHub Personal Access Tokenia JavaScriptiin tai `config.json`iin.

## Hakujen muuttaminen

Muokkaa `config.json`:

- `queries`: monikieliset GDELT-haut
- `exclude_domains`: suomalaiset lähteet, joita ei haluta mukaan
- `high_priority_domains`: tärkeys 5/5
- `major_domains`: tärkeys 4/5
- `trade_domains`: media-alan ammattijulkaisut
- `aggregator_domains`: aggregaattorit, tärkeys 1/5

`lookback` on oletuksena `3d`, jotta tuntiajo löytää myös viiveellä indeksoituneet jutut. URL estää duplikaatit.

## Deduplikointi

`scripts/update_news.py` normalisoi otsikot ja käyttää otsikkojen samankaltaisuutta. Jos otsikoiden samankaltaisuus on vähintään 0,90 ja julkaisuajat ovat enintään 72 tunnin sisällä, julkaisut ryhmitellään samaan `cluster_id`:hen.

Jos ryhmässä näkyy tunnistettu uutistoimisto kuten TT tai NTB ja sama teksti on useilla domaineilla, käyttöliittymä näyttää sen syndikointinippuna.

Tämä on heuristiikka, ei täydellinen semanttinen vertailu. Jatkouutiset, joilla on selvästi eri otsikko, jäävät omiksi ryhmikseen.

## Relevanssisuodatus

Pelkkää `STT`-hakua ei käytetä, koska se löytäisi valtavan määrän STT:n tuottamia uutisia. Hakulausekkeissa yhdistetään STT uutistoimistoa tai kriisiä kuvaaviin termeihin eri kielillä. Lisäksi skripti tekee ehdokkaalle sääntöpohjaisen tarkistuksen otsikosta, metakuvauksesta ja saatavilla olevasta sivutekstistä.

## AI-yhteenvedot ja käännökset

Tämä GitHub Pages -MVP ei tarvitse maksullista AI-API:a eikä paljasta avaimia. Automaattisesti löydetyille jutuille syntyy tällä hetkellä lyhyt sääntöpohjainen suomenkielinen kuvaus, ei varsinainen konekäännös.

Jos haluat myöhemmin aidot suomenkieliset otsikkokäännökset, tiivistelmät ja semanttisen deduplikoinnin, ne kannattaa lisätä **GitHub Actionsiin** palvelinpuolisena vaiheena ja säilyttää API-avain GitHub **Actions Secrets** -asetuksissa. Avainta ei pidä koskaan laittaa Pagesin JavaScriptiin.

## Käyttöoikeus / jakaminen kollegoille

GitHub Free -tilillä tavallinen Pages-ratkaisu kannattaa toteuttaa julkisella repolla. Lähdekoodi ja JSON-data ovat tällöin julkisesti saatavilla, vaikka jakaisit sivun linkin vain muutamalle kollegalle.

Client-side PIN ei olisi oikea suoja, koska sivun tiedostot ovat joka tapauksessa ladattavissa selaimelle. Jos sivun pitää oikeasti olla suljettu, käytä erillistä autentikoivaa kerrosta tai muuta hostausta.

## PWA

GitHub Pages käyttää HTTPS:ää, joten service worker ja asennus aloitusnäytölle toimivat. Chrome/Androidissa valitse **Asenna sovellus**. iOS Safarissa: **Jaa → Lisää Koti-valikkoon**.

## Tiedostot

- `index.html` — käyttöliittymä
- `styles.css` — ulkoasu
- `app.js` — näkymät, filtteri ja live-haku
- `config.json` — hakujen ja lähteiden asetukset
- `data/articles.json` — pysyvä uutishistoria
- `data/status.json` — viimeisin pysyvä datapäivitys
- `data/heartbeat.txt` — kuukausittainen keepalive
- `scripts/update_news.py` — GDELT-haku, relevanssi ja deduplikointi
- `.github/workflows/update-news.yml` — tuntiajo + kuukausittainen heartbeat
- `manifest.webmanifest`, `sw.js` — PWA

## Tietolähde

Automaattihaku käyttää GDELT DOC 2.0 API:a. Tarkista aina alkuperäinen artikkeli ennen journalistista käyttöä.
