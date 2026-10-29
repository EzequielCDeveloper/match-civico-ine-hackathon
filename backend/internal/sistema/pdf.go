package sistema

import (
	"bytes"
	"compress/zlib"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"strings"
	"time"

	_ "embed"
)

//go:embed ine_logo.png
var logoINEPNG []byte

// Identidad del encabezado de la app: guinda, dorado y el logo del INE.
const (
	guindaR, guindaG, guindaB = 0.412, 0.110, 0.196
	doradoR, doradoG, doradoB = 0.737, 0.584, 0.361
	tintaR, tintaG, tintaB    = 0.122, 0.161, 0.216
	grisR, grisG, grisB       = 0.420, 0.447, 0.502
	papelR, papelG, papelB    = 0.976, 0.969, 0.953
	lineaR, lineaG, lineaB    = 0.910, 0.890, 0.855
)

func compilarPDF(titulo, actor string, totalCandidatos, totalEntidades, totalPerfiles int, resumen *ResumenVotante) []byte {
	ancho, alto, img := logoRGB(logoINEPNG)
	if len(img) == 0 {
		ancho, alto, img = 1, 1, []byte{0}
	}
	contenido := dibujarPagina(titulo, totalCandidatos, totalEntidades, totalPerfiles, resumen, ancho > 10)

	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
	offsets := make([]int, 8)

	offsets[1] = pdf.Len()
	pdf.WriteString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

	offsets[2] = pdf.Len()
	pdf.WriteString("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

	offsets[3] = pdf.Len()
	pdf.WriteString("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
		"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>\nendobj\n")

	offsets[4] = pdf.Len()
	pdf.WriteString("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n")

	offsets[5] = pdf.Len()
	pdf.WriteString("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n")

	offsets[6] = pdf.Len()
	pdf.WriteString(fmt.Sprintf("6 0 obj\n<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length %d >>\nstream\n", ancho, alto, len(img)))
	pdf.Write(img)
	pdf.WriteString("\nendstream\nendobj\n")

	offsets[7] = pdf.Len()
	pdf.WriteString(fmt.Sprintf("7 0 obj\n<< /Length %d >>\nstream\n", len(contenido)))
	pdf.Write(contenido)
	pdf.WriteString("\nendstream\nendobj\n")

	xref := pdf.Len()
	pdf.WriteString("xref\n0 8\n0000000000 65535 f \n")
	for i := 1; i <= 7; i++ {
		pdf.WriteString(fmt.Sprintf("%010d 00000 n \n", offsets[i]))
	}
	pdf.WriteString("trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n")
	pdf.WriteString(fmt.Sprintf("%d\n%%EOF\n", xref))
	return pdf.Bytes()
}

func dibujarPagina(titulo string, totalCandidatos, totalEntidades, totalPerfiles int, resumen *ResumenVotante, hayLogo bool) []byte {
	var p pintor
	p.relleno(papelR, papelG, papelB)
	p.caja(0, 0, 612, 792)

	p.relleno(guindaR, guindaG, guindaB)
	p.caja(0, 786, 612, 6)
	p.relleno(doradoR, doradoG, doradoB)
	p.caja(0, 783, 612, 3)

	if hayLogo {
		// 158 pt de ancho conserva la proporción 449×111 del logo.
		p.s.WriteString("q\n158 0 0 39 36 732 cm\n/Im1 Do\nQ\n")
	}
	p.texto("F1", 18, 214, 752, guindaR, guindaG, guindaB, "Match Cívico")
	p.texto("F2", 11, 214, 734, tintaR, tintaG, tintaB, "Elecciones federales 2024")

	p.relleno(doradoR, doradoG, doradoB)
	p.caja(0, 714, 612, 3)
	p.relleno(guindaR, guindaG, guindaB)
	p.caja(0, 676, 612, 38)
	p.texto("F1", 13, 36, 690, 1, 1, 1, "Tu coincidencia en las tres boletas")
	p.texto("F2", 9, 452, 691, doradoR, doradoG, doradoB, fechaDocumento(time.Now()))

	boletas := boletasDelResumen(resumen)
	cursor := 656.0
	if resumen != nil && (resumen.Entidad != "" || resumen.Distrito != "") {
		p.texto("F1", 8, 36, cursor, doradoR, doradoG, doradoB, "DÓNDE VOTAS")
		cursor -= 16
		if resumen.Entidad != "" {
			p.texto("F1", 12, 36, cursor, tintaR, tintaG, tintaB, resumen.Entidad)
		}
		if resumen.Distrito != "" {
			p.texto("F2", 11, 250, cursor, grisR, grisG, grisB, "Distrito "+resumen.Distrito)
		}
		cursor -= 22
	} else if len(boletas) == 0 {
		p.texto("F1", 8, 36, cursor, doradoR, doradoG, doradoB, "REGISTRO")
		cursor -= 18
		p.texto("F2", 11, 36, cursor, tintaR, tintaG, tintaB, fmt.Sprintf("%d candidaturas  ·  %d entidades  ·  %d perfiles", totalCandidatos, totalEntidades, totalPerfiles))
		cursor -= 16
		if titulo != "" {
			p.texto("F2", 10, 36, cursor, grisR, grisG, grisB, titulo)
			cursor -= 8
		}
	}

	if len(boletas) == 0 && resumen == nil {
		cursor = pintarBoleta(&p, 36, cursor, 540, BoletaPDF{
			Cargo: "Base de datos",
			Nota:  fmt.Sprintf("%d candidaturas federales, %d entidades y %d perfiles ciudadanos.", totalCandidatos, totalEntidades, totalPerfiles),
		})
	}
	for _, boleta := range boletas {
		cursor = pintarBoleta(&p, 36, cursor, 540, boleta)
	}
	if len(boletas) > 0 {
		cursor -= 4
		p.texto("F1", 8, 36, cursor, doradoR, doradoG, doradoB, "CÓMO SE LEYÓ")
		cursor -= 14
		p.texto("F2", 10, 36, cursor, tintaR, tintaG, tintaB, "Diputación de tu distrito, senado de tu estado y presidencia, cada una por separado.")
		cursor -= 13
		p.texto("F2", 10, 36, cursor, tintaR, tintaG, tintaB, "El porcentaje es la afinidad con las respuestas que diste.")
	}

	p.texto("F2", 8, 36, 70, grisR, grisG, grisB, "Este resultado sale de la aplicación. No es una constancia del INE ni sustituye la boleta.")
	p.relleno(doradoR, doradoG, doradoB)
	p.caja(0, 52, 612, 3)
	p.relleno(guindaR, guindaG, guindaB)
	p.caja(0, 0, 612, 52)
	p.texto("F1", 9, 36, 30, 1, 1, 1, "Instituto Nacional Electoral")
	p.texto("F2", 8, 36, 16, doradoR, doradoG, doradoB, "Match Cívico  ·  Proceso electoral federal 2024")

	return []byte(p.s.String())
}

func pintarBoleta(p *pintor, x, arriba, w float64, b BoletaPDF) float64 {
	personas := b.Personas
	if len(personas) > 2 {
		personas = personas[:2]
	}
	alto := 72.0
	if b.Empate && len(personas) > 1 {
		alto = 108
	}
	if b.Nota != "" && len(personas) == 0 {
		alto = 64
	}
	abajo := arriba - alto

	p.relleno(1, 1, 1)
	p.caja(x, abajo, w, alto)
	p.trazo(lineaR, lineaG, lineaB)
	p.marco(x, abajo, w, alto)
	p.relleno(guindaR, guindaG, guindaB)
	p.caja(x, abajo, 5, alto)

	p.texto("F1", 9, x+18, arriba-18, guindaR, guindaG, guindaB, strings.ToUpper(b.Cargo))
	if b.Empate {
		p.texto("F2", 8, x+150, arriba-18, 0.549, 0.396, 0.180, "Empate: las respuestas no separan a una sola persona")
	}

	linea := arriba - 40
	if b.Nota != "" && len(personas) == 0 {
		p.texto("F2", 11, x+18, linea, tintaR, tintaG, tintaB, b.Nota)
		return abajo - 12
	}
	for i, persona := range personas {
		p.texto("F1", 13, x+18, linea, tintaR, tintaG, tintaB, persona.Nombre)
		if persona.Partido != "" || persona.Afinidad > 0 {
			p.texto("F1", 16, x+w-78, linea, guindaR, guindaG, guindaB, fmt.Sprintf("%d%%", persona.Afinidad))
		}
		linea -= 14
		if persona.Partido != "" {
			p.texto("F2", 10, x+18, linea, guindaR, guindaG, guindaB, persona.Partido)
			linea -= 18
		} else {
			linea -= 10
		}
		if i == 0 && b.Empate && len(personas) > 1 {
			linea -= 4
		}
	}
	return abajo - 12
}

func boletasDelResumen(resumen *ResumenVotante) []BoletaPDF {
	if resumen == nil {
		return nil
	}
	if len(resumen.Boletas) > 0 {
		return resumen.Boletas
	}
	var out []BoletaPDF
	if resumen.TopDiputacion != "" {
		out = append(out, BoletaPDF{Cargo: "Diputación", Personas: []PersonaPDF{{Nombre: resumen.TopDiputacion}}})
	}
	if resumen.TopSenado != "" {
		out = append(out, BoletaPDF{Cargo: "Senado", Personas: []PersonaPDF{{Nombre: resumen.TopSenado}}})
	}
	if resumen.TopPresidencia != "" {
		out = append(out, BoletaPDF{Cargo: "Presidencia", Personas: []PersonaPDF{{Nombre: resumen.TopPresidencia}}})
	}
	return out
}

func fechaDocumento(t time.Time) string {
	if loc, err := time.LoadLocation("America/Mexico_City"); err == nil {
		t = t.In(loc)
	}
	meses := []string{"", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"}
	return fmt.Sprintf("%d de %s de %d", t.Day(), meses[t.Month()], t.Year())
}

type pintor struct {
	s strings.Builder
}

func (p *pintor) relleno(r, g, b float64) {
	fmt.Fprintf(&p.s, "%.3f %.3f %.3f rg\n", r, g, b)
}

func (p *pintor) trazo(r, g, b float64) {
	fmt.Fprintf(&p.s, "%.3f %.3f %.3f RG\n", r, g, b)
}

func (p *pintor) caja(x, y, w, h float64) {
	fmt.Fprintf(&p.s, "%.2f %.2f %.2f %.2f re f\n", x, y, w, h)
}

func (p *pintor) marco(x, y, w, h float64) {
	fmt.Fprintf(&p.s, "0.8 w %.2f %.2f %.2f %.2f re S\n", x, y, w, h)
}

func (p *pintor) texto(fuente string, tam, x, y, r, g, b float64, s string) {
	fmt.Fprintf(&p.s, "BT /%s %.1f Tf %.3f %.3f %.3f rg 1 0 0 1 %.2f %.2f Tm (%s) Tj ET\n", fuente, tam, r, g, b, x, y, textoPDF(s))
}

func textoPDF(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case '\\', '(', ')':
			b.WriteByte('\\')
			b.WriteRune(r)
		default:
			if r >= 32 && r < 127 {
				b.WriteRune(r)
				continue
			}
			if n := latin1(r); n != 0 {
				fmt.Fprintf(&b, "\\%03o", n)
				continue
			}
			b.WriteByte(' ')
		}
	}
	return b.String()
}

func latin1(r rune) byte {
	switch r {
	case 'á':
		return 0xE1
	case 'Á':
		return 0xC1
	case 'é':
		return 0xE9
	case 'É':
		return 0xC9
	case 'í':
		return 0xED
	case 'Í':
		return 0xCD
	case 'ó':
		return 0xF3
	case 'Ó':
		return 0xD3
	case 'ú':
		return 0xFA
	case 'Ú':
		return 0xDA
	case 'ü':
		return 0xFC
	case 'Ü':
		return 0xDC
	case 'ñ':
		return 0xF1
	case 'Ñ':
		return 0xD1
	case '¿':
		return 0xBF
	case '¡':
		return 0xA1
	case '·':
		return 0xB7
	default:
		return 0
	}
}

func logoRGB(pngBytes []byte) (int, int, []byte) {
	img, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return 1, 1, nil
	}
	b := img.Bounds()
	lienzo := image.NewRGBA(b)
	papel := color.RGBA{R: 249, G: 247, B: 243, A: 255}
	draw.Draw(lienzo, b, &image.Uniform{C: papel}, image.Point{}, draw.Src)
	draw.Draw(lienzo, b, img, b.Min, draw.Over)
	raw := make([]byte, 0, b.Dx()*b.Dy()*3)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			c := lienzo.RGBAAt(x, y)
			raw = append(raw, c.R, c.G, c.B)
		}
	}
	var comprimido bytes.Buffer
	w, err := zlib.NewWriterLevel(&comprimido, zlib.BestCompression)
	if err != nil {
		return b.Dx(), b.Dy(), raw
	}
	_, _ = w.Write(raw)
	_ = w.Close()
	return b.Dx(), b.Dy(), comprimido.Bytes()
}
