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
  const { id } = req.params;
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
  const { id } = req.params;
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
  const { id } = req.params;
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

// Endpoint para obtener alojamientos de Avantio
app.get("/get-accommodations", async (req, res) => {
  const axios = require("axios");

  const BASE_ORIGIN = "https://api.avantio.pro";
  const BASE_URL = `${BASE_ORIGIN}/pms/v2/accommodations`;

  const headers = {
    "X-Avantio-Auth": AVANTIO_AUTH_TOKEN,
    "Accept": "application/json",
  };

  let queryParams = {};

  try {
    // === PAGINACIÓN ===
    // Validar y establecer tamaño de página (10-100, default: 20) SOLO si no hay cursor
    const requestedSize = parseInt(req.query.pagination_size, 10);
    const pageSize = Math.min(100, Math.max(10, isNaN(requestedSize) ? 20 : requestedSize));

    // Cursor de paginación (si se proporciona)
    if (req.query.pagination_cursor) {
      queryParams.pagination_cursor = String(req.query.pagination_cursor);
    }

    // === ORDENAMIENTO === (solo aplica cuando NO hay cursor)
    if (req.query.sort) {
      const sortParam = String(req.query.sort).trim();
      if (sortParam) queryParams.sort = sortParam;
    }

    // === FILTROS === (solo aplican cuando NO hay cursor)
    if (req.query.type) {
      const typeParam = Array.isArray(req.query.type)
        ? req.query.type.join(",")
        : String(req.query.type).trim();
      if (typeParam) queryParams.type = typeParam;
    }

    if (req.query.status) {
      const statusParam = Array.isArray(req.query.status)
        ? req.query.status.join(",")
        : String(req.query.status).trim();
      if (statusParam) queryParams.status = statusParam;
    }

    // ¿Hay cursor?
    const hasCursor = typeof queryParams.pagination_cursor === "string" && queryParams.pagination_cursor.length > 0;

    // IMPORTANTE: si hay cursor, ignoramos cualquier otro parámetro hacia Avantio
    const avantioParams = hasCursor
      ? { pagination_cursor: queryParams.pagination_cursor }
      : {
        pagination_size: pageSize,
        ...(queryParams.sort && { sort: queryParams.sort }),
        ...(queryParams.type && { type: queryParams.type }),
        ...(queryParams.status && { status: queryParams.status }),
      };

    console.log("Avantio API call:", {
      url: BASE_URL,
      paramsForwarded: avantioParams,
      originalQuery: req.query,
      timestamp: new Date().toISOString(),
    });

    // === REALIZAR PETICIÓN A AVANTIO ===
    const response = await axios.get(BASE_URL, {
      headers,
      params: avantioParams,
      timeout: 30000, // 30s
    });

    const responseData = response.data;

    // === VALIDAR ESTRUCTURA DE RESPUESTA ===
    if (!responseData || typeof responseData !== "object") {
      throw new Error("Invalid response structure from Avantio API");
    }

    // Extraer datos principales
    const accommodations = Array.isArray(responseData.data) ? responseData.data : [];
    const avantioLinks = responseData._links || {};

    console.log("Avantio response received:", {
      accommodationsCount: accommodations.length,
      hasNextLink: Boolean(avantioLinks.next),
      hasPrevLink: Boolean(avantioLinks.prev),
      timestamp: new Date().toISOString(),
    });

    // === ENRIQUECER DATOS DE CADA ALOJAMIENTO ===
    const enrichedAccommodations = await Promise.allSettled(
      accommodations.map(async (accommodation) => {
        const enrichedData = { ...accommodation };
        const links = accommodation._links || {};

        // Helper para peticiones extra
        const fetchAdditionalData = async (url, dataKey) => {
          try {
            const { data } = await axios.get(url, { headers, timeout: 10000 });
            return data;
          } catch (error) {
            console.warn(
              `Error fetching ${dataKey} for accommodation ${accommodation.id}:`,
              error?.response?.status || error.message
            );
            return null;
          }
        };

        // Consumir links adicionales en paralelo
        const additionalDataPromises = [];

        if (links.availabilities) {
          additionalDataPromises.push(
            fetchAdditionalData(links.availabilities, "availabilities").then((data) => ({
              key: "availabilities",
              data,
            }))
          );
        }
        if (links.gallery) {
          additionalDataPromises.push(
            fetchAdditionalData(links.gallery, "gallery").then((data) => ({
              key: "gallery",
              data,
            }))
          );
        }
        if (links.occupationRule) {
          additionalDataPromises.push(
            fetchAdditionalData(links.occupationRule, "occupationRule").then((data) => ({
              key: "occupationRule",
              data,
            }))
          );
        }
        if (links.rate) {
          additionalDataPromises.push(
            fetchAdditionalData(links.rate, "rate").then((data) => ({
              key: "rate",
              data,
            }))
          );
        }

        const additionalResults = await Promise.allSettled(additionalDataPromises);

        additionalResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value?.data) {
            const { key, data } = result.value;
            enrichedData[key] = data;
          }
        });

        return enrichedData;
      })
    );

    // Mantener solo los exitosos
    const finalAccommodations = enrichedAccommodations
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    // Stats de enriquecimiento
    const enrichmentStats = {
      total: accommodations.length,
      successful: finalAccommodations.length,
      failed: accommodations.length - finalAccommodations.length,
      enrichedFields: {},
    };

    finalAccommodations.forEach((acc) => {
      ["availabilities", "gallery", "occupationRule", "rate"].forEach((field) => {
        if (acc[field]) {
          enrichmentStats.enrichedFields[field] = (enrichmentStats.enrichedFields[field] || 0) + 1;
        }
      });
    });

    // === EXTRAER CURSORES DE NAVEGACIÓN DESDE _links ===
    const parseCursor = (link) => {
      try {
        if (!link) return null;
        const href = typeof link === "string" ? link : link.href;
        const u = new URL(href);
        return u.searchParams.get("pagination_cursor");
      } catch {
        return null;
      }
    };

    const nextCursor = parseCursor(avantioLinks.next);
    const prevCursor = parseCursor(avantioLinks.prev);

    // === CONSTRUIR LINKS DE NAVEGACIÓN PARA TU API ===
    const baseUrl = `${req.protocol}://${req.get("host")}${req.path}`;
    const baseParams = new URLSearchParams();

    // Preservar todos los parámetros actuales excepto pagination_cursor
    Object.keys(req.query).forEach((key) => {
      if (key === "pagination_cursor") return;
      const value = req.query[key];
      if (Array.isArray(value)) baseParams.set(key, value.join(","));
      else if (value !== undefined && value !== null && value !== "") baseParams.set(key, value);
    });

    const navigationLinks = {
      self: {
        href: `${baseUrl}${baseParams.toString() ? "?" + baseParams.toString() : ""}`,
      },
    };

    if (nextCursor) {
      const nextParams = new URLSearchParams(baseParams);
      nextParams.set("pagination_cursor", nextCursor);
      navigationLinks.next = { href: `${baseUrl}?${nextParams.toString()}` };
    }
    if (prevCursor) {
      const prevParams = new URLSearchParams(baseParams);
      prevParams.set("pagination_cursor", prevCursor);
      navigationLinks.prev = { href: `${baseUrl}?${prevParams.toString()}` };
    }

    // === CONSTRUIR RESPUESTA FINAL ===
    const finalResponse = {
      success: true,
      data: finalAccommodations,
      meta: {
        pagination: {
          // Solo mostramos size si NO hay cursor (cuando hay cursor, el tamaño está codificado en el cursor)
          ...(hasCursor ? {} : { size: pageSize }),
          current_count: finalAccommodations.length,
          has_next: Boolean(nextCursor),
          has_prev: Boolean(prevCursor),
          next_cursor: nextCursor,
          prev_cursor: prevCursor,
        },
        enrichment: {
          total_requested: accommodations.length,
          successfully_enriched: finalAccommodations.length,
          failed_enrichments: accommodations.length - finalAccommodations.length,
          fields_enriched: enrichmentStats.enrichedFields,
        },
        // Filtros aplicados (solo relevantes si NO hay cursor)
        filters_applied: hasCursor
          ? {}
          : {
            ...(queryParams.type && { type: queryParams.type }),
            ...(queryParams.status && { status: queryParams.status }),
            ...(queryParams.sort && { sort: queryParams.sort }),
            ...(pageSize && { pagination_size: pageSize }),
          },
      },
      _links: navigationLinks,
      timestamp: new Date().toISOString(),
    };

    console.log("Response summary:", {
      accommodationsReturned: finalAccommodations.length,
      hasNext: finalResponse.meta.pagination.has_next,
      hasPrev: finalResponse.meta.pagination.has_prev,
      appliedFilters: Object.keys(finalResponse.meta.filters_applied || {}).length,
      enrichmentSuccess: `${finalAccommodations.length}/${accommodations.length}`,
      nextCursorPreview: nextCursor ? nextCursor.substring(0, 24) + "..." : null,
      prevCursorPreview: prevCursor ? prevCursor.substring(0, 24) + "..." : null,
    });

    res.json(finalResponse);
  } catch (error) {
    console.error("Error in get-accommodations endpoint:", {
      message: error.message,
      status: error?.response?.status,
      avantioError: error?.response?.data,
      requestParams: queryParams,
      timestamp: new Date().toISOString(),
    });

    const status = error?.response?.status || 500;
    const errorResponse = {
      success: false,
      error: "Error fetching accommodations",
      message: error?.response?.data?.message || error?.message || "Internal server error",
      timestamp: new Date().toISOString(),
    };

    // Manejo específico de errores comunes
    if (status === 400) {
      errorResponse.error = "Invalid request parameters";
      if (error?.response?.data?.details?.pagination_cursor) {
        errorResponse.message = "Invalid pagination cursor. Please start from the first page.";
        errorResponse.suggestion = "Make a request without pagination_cursor parameter to get the first page.";
      }
    } else if (status === 401) {
      errorResponse.error = "Authentication failed";
      errorResponse.message = "Invalid or expired authentication token";
    } else if (status === 403) {
      errorResponse.error = "Access forbidden";
      errorResponse.message = "Insufficient permissions to access accommodations";
    } else if (status === 429) {
      errorResponse.error = "Rate limit";
      errorResponse.message = "Too many requests to Avantio. Try again shortly.";
    } else if (status >= 500) {
      errorResponse.error = "Server error";
      errorResponse.message = "Avantio API is currently unavailable";
    }

    if (process.env.NODE_ENV === "development") {
      errorResponse.details = {
        status,
        avantioError: error?.response?.data,
        requestUrl: BASE_URL,
        forwardedParams: (typeof req.query?.pagination_cursor === "string" && req.query.pagination_cursor.length > 0)
          ? { pagination_cursor: String(req.query.pagination_cursor) }
          : {
            pagination_size: Math.min(100, Math.max(10, parseInt(req.query.pagination_size, 10) || 20)),
            ...(req.query.sort ? { sort: String(req.query.sort).trim() } : {}),
            ...(req.query.type ? { type: Array.isArray(req.query.type) ? req.query.type.join(",") : String(req.query.type).trim() } : {}),
            ...(req.query.status ? { status: Array.isArray(req.query.status) ? req.query.status.join(",") : String(req.query.status).trim() } : {}),
          },
      };
    }

    res.status(status).json(errorResponse);
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
