const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Read data from a JSON file
 * @param {string} filename - Name of the JSON file (e.g., 'users.json')
 * @returns {Array|Object} Parsed JSON data
 */
function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return [];
  }
}

/**
 * Write data to a JSON file
 * @param {string} filename - Name of the JSON file (e.g., 'users.json')
 * @param {Array|Object} data - Data to write
 */
function writeData(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error.message);
    return false;
  }
}

/**
 * Get the next available ID for a collection
 * @param {Array} collection - Array of objects with 'id' property
 * @returns {number} Next available ID
 */
function getNextId(collection) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return 1;
  }
  return Math.max(...collection.map(item => item.id)) + 1;
}

module.exports = {
  readData,
  writeData,
  getNextId
};
