import {config} from 'dotenv';
config();

export default {
        connection:{
                host:process.env.DB_HOST,
                user:process.env.DB_USER,
                password:process.env.DB_PASSWORD,
                database:process.env.DB_NAME
        },
        company_alarm_table:process.env.COMPANY_ALARM_TABLE_NAME
};
