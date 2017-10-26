const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const scissors   = require('scissors');
const PDFImage   = require("pdf-image").PDFImage;
const bodyParser = require('body-parser');
const app        = express();
const storage    =   multer.diskStorage({
    destination: (req, file, callback) => callback(null, './uploads'),
    filename: (req, file, callback) => callback(null, file.fieldname + '-' + Date.now())
});
const upload = multer({ storage : storage});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('generated'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/main.html');
});

app.post('/upload', upload.single('pdf'), (req, res) => {
    let pdfImage = new PDFImage(path.join(__dirname, req.file.path));
    pdfImage.numberOfPages().then(pages => {
        req.file.pages = pages;
        req.file.url = pages;
        res.json(req.file)
    });
});

app.get(/\/thumb\/(.*)\.pdf\/([0-9]+)$/i, (req, res) => {
    let pdfPath = req.params[0];
    let pageNumber = req.params[1];
    let pdfImage = new PDFImage(path.join(__dirname, 'uploads', pdfPath));

    pdfImage.convertPage(pageNumber).then(imagePath => {
        res.sendFile(imagePath);
    }).catch(err => {
        res.json(err);
    });
});

app.post(/\/split\/(.*)$/i, (req, res) => {
    let splitPromise = new Promise((resolve, reject) => {
        let pdfPath = '/uploads/' + req.params[0];
        let pageNumbers = req.body.pages.split('-');
        let pdf = scissors(path.join(__dirname, pdfPath));
        let pdfImage = new PDFImage(path.join(__dirname, pdfPath));

        pageNumbers.sort((a,b) => a - b);

        pdfImage.numberOfPages().then(lastPage => {
            let links = [];
            for (let i = 0; i < pageNumbers.length; i++) {
                let filename    = req.params[0] + '-out-' + i + '.pdf';
                let last        = typeof pageNumbers[i + 1] !== "undefined" ? parseInt(pageNumbers[i + 1]) : lastPage;
                links.push(filename);
                pdf.range(parseInt(pageNumbers[i]) + 1, last).pdfStream().pipe(fs.createWriteStream(path.join(__dirname, '/generated', filename)));
            }
            resolve(links);
        });

    });

    splitPromise.then((links) => res.json(links));
});

app.listen(3000, function () {
    console.log('Listening on 3000!')
});