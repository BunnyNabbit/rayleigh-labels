const express = require('express')
const app = express()
const port = 3213
app.use('/', express.static(require("path").join(__dirname, "static")))
app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
})