import { config } from 'dotenv';
config();

export default function getAccessToken() {
    return new Promise(async function (resolve, reject) {        
        const key = await import('../public/soon-79c2e-firebase-adminsdk-h7o9r-dc2b66a1c8.json', { assert: { type: 'json' } });
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
