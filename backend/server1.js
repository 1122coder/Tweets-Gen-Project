const express = require('express');
const googleTrends = require('google-trends-api');
const app = express();

const cors = require('cors');
app.use(cors());

// Replace with your Bearer Token
const bearerToken = ' AAAAAAAAAAAAAAAAAAAAAKH3qgEAAAAAAu4nlwdhp6luTD%2B1iz3uhfB3UtI%3DkrohnYxVcv8TRmBX1BMd0vRnHKAEgi9g87QyWJYmMz4V7mu7fF';

app.get('/trends', async (req, res) => {
    try {
        const response = await fetch('https://api.twitter.com/2/trends/available', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        console.log(response);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data);
        res.send(data[0].trends);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching Twitter trends');
    }
});

// Function to fetch trends for a specific country
const fetchTrendsByCountry = (countryCode) => {
  return googleTrends.dailyTrends({
    trendDate: new Date(),
    geo: countryCode,
  }).then(response => JSON.parse(response))
    .catch(err => console.error(`Error fetching trends for ${countryCode}:`, err));
};

app.get('/api/trends', async (req, res) => {
    try {
        const countries = ['US', 'GB', 'TR', 'JP']; // USA, UK, Turkey, Japan
        const promises = countries.map(countryCode => fetchTrendsByCountry(countryCode));
        
        const results = await Promise.all(promises);
        console.log(results.trendingSearchesDays);
        res.json(results);
    } catch (err) {
        console.error('Error fetching Google Trends data:', err);
        res.status(500).send('Internal Server Error');
    }
});

const fetchRealTimeTrendsByRegion = (regionCode) => {
    return googleTrends.realTimeTrends({
        geo: regionCode,
        category: 'all',
    }).then(response => JSON.parse(response).storySummaries.trendingStories)
      .catch(err => console.error(`Error fetching real-time trends for ${regionCode}:`, err));
};

app.get('/api/global-real-time-trends', async (req, res) => {
    try {
        const regions = ['US', 'GB', 'JP', 'FR', 'DE']; // Example regions
        const promises = regions.map(region => fetchRealTimeTrendsByRegion(region));
        const results = await Promise.all(promises);

        // Log the raw results from each region
        //console.log("Raw results from each region:", results);

        let combinedTrends = [];
        results.forEach(trends => {
            combinedTrends = combinedTrends.concat(trends);
        });

        // Log the combined trends before filtering duplicates
        //console.log("Combined trends (before filtering):", combinedTrends);

        // Remove duplicates and limit to 40 trends
        const uniqueTrends = Array.from(new Set(combinedTrends.map(trend => trend.title)))
                                 .map(title => {
                                     return combinedTrends.find(trend => trend.title === title);
                                 }).slice(0, 40);

        // Log the final list of unique trends
        //console.log("Unique trends (final list):", uniqueTrends);

        res.json(uniqueTrends);
    } catch (err) {
        console.error('Error fetching global real-time trends:', err);
        res.status(500).send('Internal Server Error');
    }
});


const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
