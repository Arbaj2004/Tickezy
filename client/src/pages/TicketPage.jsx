import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Download, ArrowLeft, Ticket, Clock, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';

const TicketPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!bookingId) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/bookings/${bookingId}`, {
          credentials: 'include',
          headers
        });
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : null;
        if (!res.ok) {
          const msg = data?.message || 'Failed to load booking';
          throw new Error(msg);
        }
        setBooking(data?.data || null);
      } catch (e) {
        setError(e.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [bookingId]);

  const qrText = useMemo(() => {
    if (!booking) return '';
    const seats = (booking.seats || []).join(', ');
    const dt = booking.show_datetime ? new Date(booking.show_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const sig = booking.qr_payload?.sig ? String(booking.qr_payload.sig).slice(0, 16) : '';
    const lines = [
      'Tickezy Ticket',
      `Booking: #${booking.id}`,
      booking.movie_title ? `Movie: ${booking.movie_title}` : null,
      booking.theatre_name ? `Theatre: ${booking.theatre_name}` : null,
      booking.screen_name ? `Screen: ${booking.screen_name}` : null,
      booking.theatre_city ? `City: ${booking.theatre_city}` : null,
      dt ? `Show: ${dt}` : null,
      seats ? `Seats: ${seats}` : null,
      sig ? `Verify Sig: ${sig}…` : null
    ].filter(Boolean);
    return lines.join('\n');
  }, [booking]);

  const svgToPngDataUrl = () => new Promise((resolve) => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return resolve(null);
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    img.onload = function () {
      const size = 600; // high-res raster
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function() { resolve(null); };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  });

  const downloadPDF = async () => {
    try {
      if (!booking) return;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      // Header bar
      pdf.setFillColor(236, 72, 153); // pink-500
      pdf.rect(0, 0, pageWidth, 64, 'F');
      pdf.setTextColor(255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Tickezy', margin, 40);
      pdf.setTextColor(0);
      y = 80;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Movie Ticket', margin, y);
      y += 18;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      const addLine = (label, value) => {
        if (!value) return;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${label}:`, margin, y);
        pdf.setFont('helvetica', 'normal');
        const text = Array.isArray(value) ? value.join(', ') : String(value);
        pdf.text(text, margin + 90, y, { maxWidth: pageWidth - margin * 2 - 100 });
        y += 18;
      };

      addLine('Booking', `#${booking.id}`);
      addLine('Movie', booking.movie_title);
      addLine('Theatre', booking.theatre_name);
      addLine('Screen', booking.screen_name);
      addLine('City', booking.theatre_city);
      addLine('Show', booking.show_datetime ? new Date(booking.show_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');
      addLine('Seats', booking.seats || []);
      if (booking.total_amount) addLine('Amount', `₹${booking.total_amount}`);

      y += 8;
      pdf.setDrawColor(220);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 16;

      // QR
      const qrPng = await svgToPngDataUrl();
      if (qrPng) {
        const qrSize = 200;
        const qrX = pageWidth - margin - qrSize;
        const qrY = 96;
        pdf.addImage(qrPng, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
        y = Math.max(y, qrY + qrSize + 8);
      }

      // Verify
      const sig = booking.qr_payload?.sig ? String(booking.qr_payload.sig).slice(0, 16) : '';
      const verifyUrl = `${window.location.origin}/verify/${booking.id}`; // placeholder if you add a verifier route later
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100);
      pdf.text(`Verify: ${sig}…`, margin, y);
      y += 16;
      pdf.text(`Scan QR or visit: ${verifyUrl}`, margin, y, { maxWidth: pageWidth - margin * 2 });
      pdf.setTextColor(0);
      y += 24;

      // Terms & support
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms & Conditions', margin, y);
      y += 16;
      pdf.setFont('helvetica', 'normal');
      const terms = [
        '1) Please carry a valid ID along with this ticket.',
        '2) No refunds or cancellations post show start time.',
        '3) Theatre rules and entry checks may apply.',
        '4) QR must be presented at entry; do not share publicly.'
      ];
      terms.forEach(t => { pdf.text(t, margin, y); y += 16; });
      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Support', margin, y);
      y += 16;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Email: support@tickezy.example', margin, y);

      pdf.save(`ticket-${booking.id}.pdf`);
    } catch (err) {
      console.warn('Failed to generate PDF:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-700">Loading ticket...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-600 font-semibold mb-2">{error}</div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800">Go Back</button>
        </div>
      </div>
    );
  }

  const seats = booking?.seats || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1"/> Back to Home
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <Ticket className="w-5 h-5 text-pink-600"/>
            <h1 className="text-xl font-semibold">Your Ticket</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Movie</div>
                <div className="text-lg font-semibold">{booking?.movie_title || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Theatre</div>
                  <div className="font-medium">{booking?.theatre_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Screen</div>
                  <div className="font-medium">{booking?.screen_name}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">Show Time</div>
                  <div className="font-medium flex items-center gap-2"><Clock className="w-4 h-4"/>{booking?.show_datetime ? new Date(booking.show_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Seats</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {seats.map((s, i) => (
                    <span key={i} className="px-2 py-1 rounded bg-pink-100 text-pink-800 text-sm border border-pink-200">{s}</span>
                  ))}
                </div>
              </div>
              <div className="text-sm text-gray-500">Venue</div>
              <div className="flex items-center gap-2 text-gray-800">
                <MapPin className="w-4 h-4"/>
                <span>{booking?.theatre_city || ''}</span>
                {booking?.theatre_location ? <span>• {booking.theatre_location}</span> : null}
              </div>
              <div className="pt-2 text-sm text-gray-500">Booking ID: <span className="font-mono text-gray-800">#{booking?.id}</span></div>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                {qrText ? (
                  <QRCode id="qr-svg" value={qrText} size={320} bgColor="#ffffff" fgColor="#000000" level="Q" />
                ) : (
                  <div className="text-gray-500 text-sm">QR not available</div>
                )}
              </div>
              <button onClick={downloadPDF} className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-pink-600 hover:bg-pink-700 text-white">
                <Download className="w-4 h-4 mr-2"/> Download PDF
              </button>
              {/* no canvas needed for PDF */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
