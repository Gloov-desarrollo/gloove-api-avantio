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
          Credentials: { // Credentials no
            Language: "ES", 
            UserName: process.env.AVANTIO_USERNAME,
            Password: process.env.AVANTIO_PASSWORD,
          },
          BookingData: {
            ArrivalDate: data.arrival_date,
            DepartureDate: data.departure_date,
            Accommodation: {
              AccommodationCode: data.accommodation_id,
              UserCode: "1673940555",                // Revisar este valor
              LoginGA: process.env.AVANTIO_LOGINGA,           
            },
            Occupants: {
              AdultsNumber: data.adults_number,
            },
            ClientData: {
              Name: data.client_name,
              Surname: data.client_surname, 
              DNI: data.client_dni,
              Address: data.client_address,
              Locality: data.client_locality,
              PostCode: data.client_postcode,
              City: data.client_city,
              Country: data.client_country,
              ISOCountryCode: data.client_iso_country_code,
              Telephone: data.client_phone,
              Telephone2: data.client_phone2 || "-",
              EMail: data.client_email,
              Fax: data.client_fax || "-",
              Language: data.client_language || "EN",
            },
            PaymentMethod: 1,
            BookingType: "PAID",
            SendMailToOrganization: "FALSE",
            SendMailToTourist: "FALSE",
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
