// api/scrape.js

// Import des bibliothèques nécessaires
const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
const path = require('path');

// Charger les credentials Google depuis une variable d'environnement
// const keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const googleConfig = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Fonction pour enregistrer les données dans Google Sheets
async function saveDataToGoogleSheets(data) {
  try {
    const spreadsheetId = '1NFisQtEbZ6ep54F99gbUs7WJkLOn1cwgQcmfTDPhf0U';
    const range = 'Feuille1!A2';

    // Créer un horodatage actuel
    const currentDate = new Date().toLocaleString();

    // Préparer les données en tableau de tableaux
    const values = data.map(item => [
      item.imageUrl,
      item.caption,
      item.description,
      currentDate,  // Ajouter l'horodatage
    ]);

    // Enregistrer les données dans Google Sheets
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

// Fonction serverless pour gérer les requêtes GET sur /api/scrape
module.exports = async (req, res) => {
  // Vérifier que l'URL est bien fournie
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL est requise' });
  }

  try {
    // Effectuer une requête HTTP vers l'URL pour récupérer les données HTML
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Scraper les images et leurs informations
    const images = [];
    const baseUrl = 'https://wol.jw.org';

    $('img').each((i, el) => {
      const imageUrl = baseUrl + $(el).attr('src');
      const caption = $(el).attr('alt') || $(el).parent().text().trim() || "Aucune légende disponible";
      const description = $(el).parent().next().text().trim() || "Aucune description disponible";
      images.push({ imageUrl, caption, description });
    });

    // Sauvegarder les images dans Google Sheets
    await saveDataToGoogleSheets(images);

    // Répondre avec succès et les données des images
    res.status(200).json({
      status: 'success',
      images: images,
    });
  } catch (error) {
    console.error('Erreur de scraping:', error);
    res.status(500).json({ error: 'Erreur de scraping de la page' });
  }
};