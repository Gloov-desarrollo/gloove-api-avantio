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
                Language: 'EN',
                UserName: process.env.AVANTIO_USERNAME,
                Password: process.env.AVANTIO_PASSWORD,
            },
            Criteria: {
                AccommodationCode: data.accommodation_id,
                LoginGA: data.login_ga,
                UserCode: data.user_code,
                ArrivalDate: data.arrival_date,
                DepartureDate: data.departure_date,
                ClientData: {
                    Name: data.client_name,
                    Surname: data.client_surname,
                    DNI: data.client_dni,
                    Email: data.client_email,
                    Telephone: data.client_phone,
                    Address: data.client_address,
                    City: data.client_city,
                    Country: data.client_country,
                },
                Board: data.board, 
                PaymentMethod: data.payment_method,
                CreditCardData: data.payment_method === 'CREDIT_CARD' ? {
                    CardType: data.card_type,
                    CardNumber: data.card_number,
                    ExpiryDate: data.expiry_date,
                    Cardholder: data.cardholder,
                    CCVCode: data.ccv_code,
                } : undefined,
                SendMailToOrganization: true,
                SendMailToTourist: true,
            }
        };

        return new Promise((resolve, reject) => {
            this.client?.SetBooking(params, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    }
}

module.exports = AvantioService;
