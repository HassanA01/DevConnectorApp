const config = require('config');
const { default: mongoose } = require('mongoose');

const db = config.get('mongoURI');

const connectDB = async () => {
    try {
        
        mongoose.connect(db);


        console.log('MongoDB connected');

    } catch (err) {
        
        console.err(err.message);
        process.exit(1);
    }
}

module.exports = connectDB;