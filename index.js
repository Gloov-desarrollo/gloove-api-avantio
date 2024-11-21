const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const axios = require('axios');
require('dotenv').config();
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
    res.json(response.data);
  } catch (error) {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
