package sistema

import (
	"strings"
	"testing"
)

func TestCompilarPDF_LlevaLogoYAcentos(t *testing.T) {
	pdf := compilarPDF("Reporte de CANDIDATOS", "usuario_sistema", 4584, 32, 1, &ResumenVotante{
		Entidad:  "Aguascalientes",
		Distrito: "1 · JESUS MARIA",
		Boletas: []BoletaPDF{
			{
				Cargo:  "Diputación",
				Empate: true,
				Personas: []PersonaPDF{
					{Nombre: "HUMBERTO AMBRIZ DELGADILLO", Partido: "FUERZA Y CORAZON POR MEXICO", Afinidad: 39},
					{Nombre: "FRANCISCO ARTURO FEDERICO AVILA ANAYA", Partido: "SIGAMOS HACIENDO HISTORIA", Afinidad: 39},
				},
			},
			{
				Cargo: "Senado",
				Personas: []PersonaPDF{
					{Nombre: "JORGE ARMANDO NARVAEZ NARVAEZ", Partido: "MOVIMIENTO CIUDADANO", Afinidad: 91},
				},
			},
			{
				Cargo:  "Presidencia",
				Empate: true,
				Personas: []PersonaPDF{
					{Nombre: "BERTHA XÓCHITL GÁLVEZ RUIZ", Partido: "FUERZA Y CORAZON POR MEXICO", Afinidad: 44},
					{Nombre: "JORGE ÁLVAREZ MÁYNEZ", Partido: "MOVIMIENTO CIUDADANO", Afinidad: 44},
				},
			},
		},
	})
	if !strings.HasPrefix(string(pdf), "%PDF-1.4") {
		t.Fatal("el documento no es PDF 1.4")
	}
	if !strings.Contains(string(pdf), "/Subtype /Image") {
		t.Fatal("el PDF no incrusta el logo")
	}
	if !strings.Contains(string(pdf), "Match C") {
		t.Fatal("el PDF no incluye el título")
	}
}
