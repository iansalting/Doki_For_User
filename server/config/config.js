import dotenv from 'dotenv'
dotenv.config()

const config = Object.freeze({
    port: process.env.PORT || 8000,
    databaseURI: process.env.MONGO_URI,
    accessTokenSecret: process.env.JWT_SECRET,
    stripeKey: process.env.STRIPE_SECRET_KEY,
    resetLink: process.env.CLIENT_URL,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
});


export default config;