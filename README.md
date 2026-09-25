# Dog Sitting At Danni's House

**Professional Pet Care Services | Cost Calculator & Booking Platform**

[![Status](https://img.shields.io/badge/status-production-success.svg)](https://github.com/dannisdogs/dannisdogs.github.io)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0-brightgreen.svg)](https://github.com/dannisdogs/dannisdogs.github.io/releases)

## Overview

Dog Sitting At Danni's House provides professional pet care services in a home environment. This platform offers transparent pricing calculations, instant service estimates, and professional documentation for pet boarding services.

### Core Value Proposition

- **Transparent Pricing**: No hidden fees or surprise charges
- **Professional Service**: Experienced pet care with detailed protocols
- **Instant Quotes**: Real-time cost calculations and estimate generation
- **Multi-Pet Support**: Automated pricing for multiple pet households
- **Professional Documentation**: Print-ready estimates and calendar integration

## Service Offerings

### Primary Services

**24-Hour Boarding**: $55.00 per 24-hour period
- Overnight care in residential environment
- Regular feeding and exercise schedules
- Secure, comfortable accommodation
- Progress updates and documentation

**Extended Hours**: $5.00 per hour
- Flexible drop-off and pick-up scheduling
- Early morning and evening care available
- Automatic conversion to daily rates when applicable

**Multi-Pet Services**: 20% off each additional pet
- All pets accommodated together
- Individual attention and care protocols
- Volume pricing for family pet households

**Holiday Stays**: 5% holiday fee on top of the stay total
- Applies when the stay includes a holiday
- Calculated on the total after any multi-pet discount
- Toggle "Holiday Stay" in the calculator to include it

### Service Policies

- **Deposit Requirement**: $50 for stays exceeding 3 days
- **Holiday Fee**: 5% of the stay total when the stay includes a holiday
- **Payment Methods**: Cash (preferred), Venmo accepted
- **Estimate Validity**: 30 days from issue date
- **Cancellation Policy**: 24-hour advance notice required

## Technical Specifications

### Platform Architecture

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Design System**: Professional dark theme with gradient accents
- **Performance**: Hardware-accelerated animations, optimized rendering
- **Compatibility**: Cross-browser support (Chrome, Firefox, Safari, Edge)
- **Mobile Support**: Responsive design for all device types

### Features

#### Cost Calculator
- Real-time pricing calculations
- Multi-pet pricing algorithms
- Holiday stay toggle with percentage holiday fee (`HOLIDAY_FEE_RATE` in `script.js`)
- Date range processing with hour calculations
- Professional estimate generation

#### Documentation Export
- PDF estimate generation
- Calendar integration (.ics format)
- Print-optimized layouts
- Professional receipt formatting

#### User Interface
- Form validation with error handling
- Loading states and progress indicators
- Smooth animations and transitions
- Professional success confirmations

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | Full Support |
| Firefox | 88+ | Full Support |
| Safari | 14+ | Full Support |
| Edge | 90+ | Full Support |

## Installation & Deployment

### Local Development

```bash
# Clone repository
git clone https://github.com/dannisdogs/dannisdogs.github.io.git
cd dannisdogs.github.io

# Start local server
python3 -m http.server 8080

# Access application
open http://localhost:8080
```

### Production Deployment

**GitHub Pages (Recommended)**
1. Push code to main branch
2. Navigate to Repository Settings → Pages
3. Source: Deploy from branch (main, /docs)
4. Access at: `https://dannisdogs.github.io`

**Alternative Deployment**
- Any static web hosting provider
- CDN deployment supported
- No server-side requirements

## API Reference

### Calculator Functions

#### `calculateCost(dropoff, pickup, pets)`
Processes service dates and pet information to generate cost estimates.

**Parameters:**
- `dropoff` (Date): Service start date and time
- `pickup` (Date): Service end date and time
- `pets` (Array): Pet information objects

**Returns:**
- `estimate` (Object): Complete cost breakdown and total

#### `generateEstimate()`
Creates formatted estimate with quote number and professional layout.

**Returns:**
- `quote` (Object): Print-ready estimate document

## Development Guidelines

### Code Standards
- ES6+ JavaScript syntax
- CSS3 with custom properties
- Semantic HTML5 markup
- WCAG 2.1 accessibility compliance

### Performance Requirements
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- 60fps animation performance

### Browser Testing
- Cross-browser compatibility testing required
- Mobile device testing across iOS and Android
- Print layout verification for estimate output

## Security & Compliance

### Data Handling
- No sensitive data storage
- Local browser storage only
- No external API dependencies
- Client-side processing exclusively

### Privacy
- No user tracking or analytics
- No third-party data sharing
- Local calculation processing
- Browser-only data persistence

## Support & Maintenance

### Technical Support
For technical issues or feature requests:
- Create GitHub issue
- Include browser and version information
- Provide detailed reproduction steps

### Service Inquiries
For pet care service bookings:
- Use the integrated cost calculator
- Generate estimate for service quotes
- Contact information available via estimate output

## License & Copyright

**MIT License**

Copyright © 2025 Dog Sitting At Danni's House

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

## Version History

### Version 2.0 (Current)
- Holiday stay toggle and holiday fee
- Professional UI redesign
- Enhanced performance optimizations
- Improved print functionality
- Mobile responsiveness improvements

### Version 1.0
- Initial calculator implementation
- Basic pricing functionality
- Simple receipt generation

---

**Professional Pet Care Services** | Built with modern web technologies for reliable service delivery
