import { config } from 'dotenv';
config();

export default function getAccessToken() {
    return new Promise(function (resolve, reject) {
        const key = require('../public/service-account.json');
        const jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        );
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
};
