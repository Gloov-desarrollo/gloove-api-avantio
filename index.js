const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;
const axios = require('axios');
require('dotenv').config();
const fs = require("fs");
const xml2js = require("xml2js");
const cors = require('cors');
app.use(cors()); 

app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('API Avantio - Gloove');
});

// Trae todas las reservas
app.get('/bookings', async (req, res) => {
  try {
    const response = await axios.get('https://api.avantio.pro/pms/v2/bookings', {
      headers: {
        'Content-Type': 'application/json',
        'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
      },
    });
    console.log("TOKEN: ", process.env.AVANTIO_AUTH_TOKEN)
    res.json(response.data);
  } catch (error) {
    console.log("TOKEN: ", process.env.AVANTIO_AUTH_TOKEN)
    console.error(error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Trae reserva por ID
app.get('/bookings/:id', async (req, res) => {
  const {id} = req.params;
  try {
    const response = await axios.get(`https://api.avantio.pro/pms/v2/bookings/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Trae detalles de una propiedad
app.get('/accommodations/:id', async (req, res) => {
  const {id} = req.params;
  try {
    const response = await axios.get(`https://api.avantio.pro/pms/v2/accommodations/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Trae info de un huesped
app.get('/huesped/:id', async (req, res) => {
  const {id} = req.params;
  try {
    const response = await axios.get(`https://api.avantio.pro/pms/v2/guests/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Convierto XML de viviendas (descriptions.xml) a JSON
app.get("/viviendas-json", async (req, res) => {
  try {
    // leo xml
    const xmlFilePath = path.join(__dirname, "assets/descriptions.xml");
    const xmlData = fs.readFileSync(xmlFilePath, "utf-8");

    // convierto a json
    const parser = new xml2js.Parser();
    const jsonData = await parser.parseStringPromise(xmlData);

    res.json(jsonData);
  } catch (error) {
    console.error("Error processing XML:", error);
    res.status(500).json({ error: "Failed to process XML file" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
