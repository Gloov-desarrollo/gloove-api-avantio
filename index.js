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

// Trae las reservas de un usuario
app.get("/bookings/customer/:customerId", async (req, res) => {
  const { customerId } = req.params;

  try {
    // trae todas las reservas
    const listRes = await axios.get(`https://api.avantio.pro/pms/v2/bookings`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
      }
    });
    const basicBookings = listRes.data.data;

    // les agrego toda la info de booking by id
    const detailPromises = basicBookings.map(b =>
      axios.get(`https://api.avantio.pro/pms/v2/bookings/${b.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
        }
      })
    );
    const detailResponses = await Promise.all(detailPromises);
    const detailedBookings = detailResponses.map(r => r.data.data);

    // filtro por customerId
    const guestBookings = detailedBookings.filter(
      booking => booking.customer?.id === customerId
    );

    // res
    return res.json({ data: guestBookings });
  } catch (error) {
    console.error("Error fetching bookings by customer:", error.message);
    const status = error.response?.status || 500;
    return res.status(status).json({ error: "Error fetching bookings" });
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

//Trae info de un huesped
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

// Trae un alojamiento con datos adicionales
app.get('/accommodations-add/:id', async (req, res) => {
  const { id } = req.params;
  const API_BASE_URL = `https://api.avantio.pro/pms/v2/accommodations/${id}`;

  try {
    // Consulta el alojamiento específico por ID
    const response = await axios.get(API_BASE_URL, {
      headers: {
        'Content-Type': 'application/json',
        'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
      },
    });

    const accommodation = response.data;

    // Construye los enlaces adicionales
    const links = {
      self: `https://api.avantio.pro/pms/v2/accommodations/${id}`,
      availabilities: `https://api.avantio.pro/pms/v2/accommodations/${id}/availabilities`,
      gallery: `https://api.avantio.pro/pms/v2/accommodations/${id}/gallery`,
      occupationRule: `https://api.avantio.pro/pms/v2/accommodations/${id}/occupationRule`
    };

    // Obtiene los datos adicionales utilizando esos enlaces
    const additionalData = await fetchAdditionalData(links);

    //Agrega los datos adicionales
    const enrichedAccommodation = { ...accommodation, ...additionalData };

    res.json(enrichedAccommodation);

  } catch (error) {
    console.error(error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Trae la tarifa (rate) de un alojamiento por su ID
app.get('/accommodations/rate/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(
      `https://api.avantio.pro/pms/v2/accommodations/${id}/rate`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
          'accept': 'application/json'
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching accommodation rate:', error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: error.message });
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

// Treae los datos adicionales de los alojamientos
app.get("/get-accommodations", async (req, res) => {
  const API_BASE_URL = "https://api.avantio.pro/pms/v2/accommodations?status=ENABLED";

  const paginationSize = parseInt(req.query.pagination_size) || 20; 
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

app.get("/accommodations/owner/:ownerId", async (req, res) => {
  const { ownerId } = req.params;

  try {
    // traigo todas las propiedades
    const response = await axios.get(
      "https://api.avantio.pro/pms/v2/accommodations?status=ENABLED",
      { headers: { "X-Avantio-Auth": AVANTIO_AUTH_TOKEN } }
    );
    const accommodations = response.data.data;

    // le agrego la data extra
    const enriched = await Promise.all(
      accommodations.map(async (acc) => {
        const additional = await fetchAdditionalData(acc._links);
        // El owner real está en additional.self.data.owner
        const owner = additional.self?.data?.owner || null;
        return {
          ...acc,
          owner,                 
          self: additional.self,
          availabilities: additional.availabilities,
          gallery: additional.gallery,
          occupationRule: additional.occupationRule,
        };
      })
    );

    // filtro por owner id
    const filtered = enriched.filter(
      (acc) => acc.owner && acc.owner.id === ownerId
    );

    // res
    res.json({ data: filtered });
  } catch (err) {
    console.error("Error fetching accommodations by owner:", err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: "Error fetching accommodations" });
  }
});

// Crea un usuario customer en Avantio
app.post('/create-customer', async (req, res) => {
  const { name, surnames } = req.body;

  if (!name || !surnames) {
    return res.status(400).json({ error: 'El nombre y los apellidos son requeridos.' });
  }

  try {
    const response = await axios.post(
      'https://api.avantio.pro/pms/v2/customers',
      {
        language: 'es_ES',
        name,
        surnames: [surnames],
      },
      {
        headers: {
          'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error al crear el customer en Avantio:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Error al crear el customer en Avantio' });
  }
});

// Crea un Owner en Avantio
app.post('/create-owner', async (req, res) => {
  const { name, surnames } = req.body; 

  if (!name || !surnames) {
    return res.status(400).json({ error: 'El nombre y los apellidos son requeridos.' });
  }

  try {
    const response = await axios.post(
      'https://api.avantio.pro/pms/v2/owners',
      {
        language: 'es_ES',
        name,
        surnames: [surnames],
      },
      {
        headers: {
          'X-Avantio-Auth': process.env.AVANTIO_AUTH_TOKEN,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error al crear el owner en Avantio:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Error al crear el owner en Avantio' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
