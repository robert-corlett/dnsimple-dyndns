// updated to fetch the device's current public ipv6 address

const axios = require('axios').default
const GET_JSON_IP_URL = 'https://api64.ipify.org?format=json'

module.exports = async (command) => {
  let ipAddress = null
  await axios.get(GET_JSON_IP_URL).then(response => {
    ipAddress = response.data.ip
  }).catch(error => {
    command.error(error.message)
  })
  return ipAddress
}
