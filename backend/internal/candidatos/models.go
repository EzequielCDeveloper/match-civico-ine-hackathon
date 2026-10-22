package candidatos

// Candidato represents a political candidate record from candidatos_candidatos table.
type Candidato struct {
	IDAnonimo           int    `json:"id_anonimo"`
	NombreCandidato     string `json:"nombre_candidato"`
	PartidoCoalicion    string `json:"partido_coalicion"`
	Cargo               string `json:"cargo"`
	Entidad             string `json:"entidad"`
	DistritoID          int    `json:"distrito_id"`
	DistritoNombre      string `json:"distrito_nombre"`
	DistritoFederal     string `json:"distrito_federal"`
	Circunscripcion     string `json:"circunscripcion"`
	Municipio           string `json:"municipio"`
	NumListaOFormula    string `json:"num_lista_o_formula"`
	TipoCandidato       string `json:"tipo_candidato"`
	Estatus             string `json:"estatus"`
	Edad                int    `json:"edad"`
	Sexo                string `json:"sexo"`
	Escolaridad         string `json:"escolaridad"`
	EstatusEscolaridad  string `json:"estatus_escolaridad"`
	TieneTitulo         bool   `json:"tiene_titulo"`
	Estudios            string `json:"estudios"`
	Cursos              string `json:"cursos"`
	HistoriaProfesional string `json:"historia_profesional"`
	TrayectoriaPolitica string `json:"trayectoria_politica"`
	MotivoCargoPublico  string `json:"motivo_cargo_publico"`
	Propuesta1          string `json:"propuesta_1"`
	Propuesta2          string `json:"propuesta_2"`
	PropuestaGenero     string `json:"propuesta_genero"`
	TienePropuestas     bool   `json:"tiene_propuestas"`
}

// FiltroCandidatos represents the query parameters supported for candidate filtering.
type FiltroCandidatos struct {
	Cargo       string `json:"cargo"`
	Entidad     string `json:"entidad"`
	DistritoID  int    `json:"distrito_id"`
	Escolaridad string `json:"escolaridad"`
	TieneTitulo *bool  `json:"tiene_titulo"`
	Query       string `json:"q"`
	Limit       int    `json:"limit"`
	Offset      int    `json:"offset"`
}

// CandidatoListResponse standardizes list responses.
type CandidatoListResponse struct {
	Total int         `json:"total"`
	Items []Candidato `json:"items"`
}

// MatchCandidato is the payload for the blind comparison. No contact fields.
type MatchCandidato struct {
	IDAnonimo        int                `json:"id_anonimo"`
	NombreCandidato  string             `json:"nombre_candidato"`
	PartidoCoalicion string             `json:"partido_coalicion"`
	Cargo            string             `json:"cargo"`
	Propuesta1       string             `json:"propuesta_1"`
	Propuesta2       string             `json:"propuesta_2"`
	Etiquetas        map[string]float64 `json:"etiquetas"`
}
