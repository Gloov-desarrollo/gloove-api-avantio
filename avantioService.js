const soap = require('soap');
const dotenv = require('dotenv');

dotenv.config();

const WSDL_URL = 'https://ws.avantio.com/soap/vrmsConnectionServices.php?wsdl';

class AvantioService {
    

    async initClient() {
        if (!this.client) {
            this.client = await soap.createClientAsync(WSDL_URL);
        }
    }

    async setBooking(data) {
        await this.initClient();
      
        const params = {
          Credentials: {
            Language: "ES", // O "EN" según lo que necesites
            UserName: process.env.AVANTIO_USERNAME,
            Password: process.env.AVANTIO_PASSWORD,
          },
          BookingData: {
            ArrivalDate: data.arrival_date,       // Ej: "2021-07-17"
            DepartureDate: data.departure_date,     // Ej: "2021-07-31"
            Accommodation: {
              AccommodationCode: data.accommodation_id, // Ej: "59100"
              UserCode: data.user_code,                // Ej: "76"
              LoginGA: data.login_ga,                  // Ej: "lito212"
            },
            Occupants: {
              AdultsNumber: data.adults_number,        // Ej: 8
            },
            ClientData: {
              Name: data.client_name,                  // "John"
              Surname: data.client_surname,            // "Doe"
              DNI: data.client_dni,                    // "32659754D"
              Address: data.client_address,            // "Test Street"
              Locality: data.client_locality,          // "Valencia"
              PostCode: data.client_postcode,          // "46000"
              City: data.client_city,                  // "Valencia"
              Country: data.client_country,            // "ES"
              ISOCountryCode: data.client_iso_country_code, // "ES"
              Telephone: data.client_phone,            // "666666666"
              Telephone2: data.client_phone2 || "-",   // En caso de no tenerlo
              EMail: data.client_email,                // "johndoe@themorgue.com" (ojo con la M mayúscula)
              Fax: data.client_fax || "-",
              Language: data.client_language || "EN",
            },
            PaymentMethod: data.payment_method,        // Ej: 1
            BookingType: data.booking_type,            // Ej: "PAID"
            SendMailToOrganization: data.send_mail_to_organization, // Ej: "FALSE"
            SendMailToTourist: data.send_mail_to_tourist,           // Ej: "FALSE"
          }
        };
      
        return new Promise((resolve, reject) => {
          this.client?.SetBooking(params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
      
}

module.exports = AvantioService;
