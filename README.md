# Treasury Alcohol Label Verification App

## Overview

The Treasury Alcohol Label Verification App is a web-based application that uses Optical Character Recognition (OCR) to analyze alcohol beverage labels and verify compliance with required labeling fields.

The application allows users to upload an image of an alcohol label, extracts text using OCR, and evaluates the label against key compliance requirements.

## Features

* Upload alcohol label images
* OCR text extraction using Tesseract.js
* Compliance validation engine
* Automatic compliance scoring
* OCR confidence scoring
* Government warning detection
* Alcohol content detection
* Net contents detection
* Brand name detection
* Class/type detection
* Clear and re-analyze functionality
* Image quality warnings

## Compliance Checks

The application verifies the following fields:

* Brand Name
* Class/Type
* Alcohol Content
* Net Contents
* Government Warning

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### OCR Engine

* Tesseract.js

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/treasury-label-checker.git
```

Navigate to the project directory:

```bash
cd treasury-label-checker
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Usage

1. Launch the application.
2. Upload an alcohol label image.
3. Click Analyze Label.
4. Review compliance results.
5. Review OCR confidence score.
6. Review extracted OCR text.

## Example Output

### Compliance Results

| Required Field     | Status |
| ------------------ | ------ |
| Brand Name         | PASS   |
| Class/Type         | PASS   |
| Alcohol Content    | PASS   |
| Net Contents       | PASS   |
| Government Warning | PASS   |

Compliance Score:

```text
100%
```

OCR Confidence:

```text
92%
```

## Future Enhancements

* Image preprocessing
* Automatic image rotation
* Multiple label support
* Front and back label comparison
* PDF support
* Export results to PDF
* Export results to CSV
* Enhanced OCR accuracy
* AI-powered compliance recommendations

## Project Status

Current Status:

```text
Working Prototype
```

Implemented:

* OCR extraction
* Compliance scoring
* Confidence scoring
* Error handling
* Image quality warnings
* Dynamic rule matching

## Author

Jamie Clarke

## License

This project is provided for educational and demonstration purposes.
