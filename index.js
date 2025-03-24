const AvantioService = require('./avantioService');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;
const AVANTIO_AUTH_TOKEN = process.env.AVANTIO_AUTH_TOKEN;
const axios = require('axios');
require('dotenv').config();
const fs = require("fs");
const xml2js = require("xml2js");
const cors = require('cors');
app.use(cors()); 

app.use(express.json());

//inicializo avantioService
const avantioService = new AvantioService();

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

app.post('/set-booking', async (req, res) => {
  try {
      const data = req.body;
      const result = await avantioService.setBooking(data);
      res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).send(error.message);
  }
});

//Funcion para traer info adicional de cada alojamiento
const fetchAdditionalData = async (links) => {

  try {
    // Trae las 4 peticiones en paralelo 
    const responses = await Promise.allSettled([
      axios.get(links.self, { headers: { 'X-Avantio-Auth': AVANTIO_AUTH_TOKEN } }),
      axios.get(links.availabilities, { headers: { 'X-Avantio-Auth': AVANTIO_AUTH_TOKEN } }),
      axios.get(links.gallery, { headers: { 'X-Avantio-Auth': AVANTIO_AUTH_TOKEN } }),
      axios.get(links.occupationRule, { headers: { 'X-Avantio-Auth': AVANTIO_AUTH_TOKEN } })
    ]);

    // Retorna un objeto con la info adicional de cada alojamiento 
    return {
      self: responses[0].status === "fulfilled" ? responses[0].value.data : null,
      availabilities: responses[1].status === "fulfilled" ? responses[1].value.data : null,
      gallery: responses[2].status === "fulfilled" ? responses[2].value.data : null,
      occupationRule: responses[3].status === "fulfilled" ? responses[3].value.data : null,
    };

  } catch (error) {
    return { error: "Error fetching additional data" };
  }
};

// Treae los datos adicionales de los alojamientos
app.get("/get-accommodations", async (req, res) => {
  const API_BASE_URL = "https://api.avantio.pro/pms/v2/accommodations";

  const paginationSize = parseInt(req.query.pagination_size) || 20; //Pagination por defecto en 20
  if (paginationSize > 100) {
    return res.status(400).json({ error: "Pagination size must be less than 100" });
  }
  if(paginationSize < 10){
    return res.status(400).json({ error: "Pagination size must be greater than 10" });
  }
  try {
    // Consulta lista de alojamientos
    const response = await axios.get(API_BASE_URL, {
      headers: { 'X-Avantio-Auth': AVANTIO_AUTH_TOKEN },
      params: { pagination_size: paginationSize }
    });

    // Desestructuro los datos
    const accommodations = response.data.data; 

    // recorro cada alojamiento y le agrego la info adicional de la función fetchAdditionalData
    const enrichedAccommodations = await Promise.all(accommodations.map(async (accommodation) => {
      const additionalData = await fetchAdditionalData(accommodation._links);
      return { ...accommodation, ...additionalData };
    }));

    res.json({
      data: enrichedAccommodations,
      pagination: {paginationSize}
    });

  } catch (error) {
    console.error("Error fetching accommodations:", error.message);
    res.status(error.response?.status || 500).json({ error: "Error fetching accommodations" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
