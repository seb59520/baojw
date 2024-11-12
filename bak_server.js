const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = 3000;

// Permet à tous les domaines d'accéder à l'API
app.use(cors());

const keys = require(path.join(__dirname, 'google-service-account.json'));

const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Fonction pour enregistrer les données dans Google Sheets
async function saveDataToGoogleSheets(data) {
  try {
    const spreadsheetId = '1NFisQtEbZ6ep54F99gbUs7WJkLOn1cwgQcmfTDPhf0U';
    const range = 'Feuille1!A2'; // Assurez-vous que le nom de la feuille est correct

    // Structurez les valeurs sous forme de tableau de tableaux
    const values = data.map(item => [item.imageUrl, item.caption, item.description]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: values },
    });

    console.log('Données sauvegardées avec succès dans Google Sheets.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données dans Google Sheets:', error);
  }
}

// Route pour effectuer le scraping
app.get('/scrape', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send({ error: 'URL est requise' });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const images = [];
    const baseUrl = 'https://wol.jw.org'; // Remplacez par le domaine correct

    // Scraper les images
    $('img').each((i, el) => {
      const imageUrl = baseUrl + $(el).attr('src');
      const caption = $(el).attr('alt') || $(el).parent().text().trim() || "Aucune légende disponible";
      const description = $(el).parent().next().text().trim() || "Aucune description disponible";

      images.push({ imageUrl, caption, description });
    });

    // Sauvegarder dans Google Sheets
    await saveDataToGoogleSheets(images);

    res.status(200).send({
      status: 'success',
      images: images,
    });
  } catch (error) {
    console.error('Erreur de scraping:', error);
    res.status(500).send({ error: 'Erreur de scraping de la page' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});