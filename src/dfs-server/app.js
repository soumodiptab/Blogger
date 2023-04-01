const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');
const axios = require('axios');
const mime = require('mime');

const { createLogger, transports, format } = require('winston');

const app = express();

app.use(express.json());

// Configure Winston logger
const logger = createLogger({
  level: 'info',
  transports: [
    new transports.File({ filename: 'server.log', format: format.combine(format.timestamp(), format.json()) }),
  ],
});

app.use('/public', express.static('public', {
    setHeaders: (res, path) => {
      res.setHeader('Content-Type', mime.getType(path));
    }
  }));
  

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Define routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/history', (req, res) => {
    // Read data from server.log file
    const data = fs.readFileSync('server.log', 'utf8');
  
    // Split the data into an array of lines
    const lines = data.trim().split('\n');
  
    // Parse each line into an object with timestamp and message properties
    const parsedData = lines.slice(-20).map(line => {
      const obj = JSON.parse(line);
      const message = obj.message;
      const timestamp = obj['timestamp'];
      return { timestamp, message };
    });
  
    // Sort the data by timestamp in descending order
    const sortedData = parsedData.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  
    // Render the history page with the sorted data
    res.render('history', { data: sortedData });
  });

  app.get('/current', (req, res) => {
    
    res.render('current', { data: "Work in Progress" });
  });
  

app.post('/login', async (req, res) => {
  const ip_address = req.body.ip_address;
  const encryptedData = [];

  const stream = fs.createReadStream('users.csv')
    .pipe(csv());

  for await (const row of stream) {
    const username = row.username;
    const password = row.password;

    // hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    encryptedData.push({ username, password: hashedPassword });
  }

  res.json(encryptedData);

  // Log response
  logger.info(ip_address+" Requested College List");
});


app.post('/sender_request', async (req, res) => {
  const { uuid, Filename, Size, Sender_id, Receiver_id } = req.body;

  try {
    // Read the IP address of the receiver from the CSV file
    const stream = fs.createReadStream('users.csv')
      .pipe(csv());

    for await (const row of stream) {
      if (row.username === Receiver_id) {
        const receiverIp = row.ip_address;

        logger.info("Institute "+Sender_id + " Requested to send file " + Filename + " to Institute " + Receiver_id + " with size " + Size + " with UUID " + uuid);
        // Make a request to the receiver's API with the necessary data
        // const response = await axios.post(`http://${receiverIp}/dfs_request`, {
        const response = await axios.post(`http://localhost:4000/dfs_request`, {
          uuid,
          Filename,
          Size,
          Sender_id,
        });

        const { status } = response.data;

        // Return a response to the sender API based on the DFS response status
        if (status === 1) {
          res.status(200).json({ message: 'Request accepted' });
          // Log response
          logger.info("Institute "+Receiver_id+" Accepted the request");

          
          return;
        } else {
          res.status(400).json({ message: 'Request rejected' });
          // Log response
          
          logger.info("Institute "+Receiver_id+" Rejected the request");
          
          return;
        }
      }
    }

    // If we reach the end of the CSV file without finding the receiver's IP,
    // return an error response
    res.status(400).json({ error: 'Receiver ID not found' });

    // Log response
    logger.info("Institute "+Receiver_id+" Not Found");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });

    // Log error
    logger.error("Internal Server Error");
  }
});

app.listen(3000, () => {
    logger.info('Server started on port 3000');
});
