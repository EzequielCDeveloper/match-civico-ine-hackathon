package votantes

// EntidadVotante represents civic voter participation metrics by federal entity.
type EntidadVotante struct {
	EntidadID                             int     `json:"entidad_id"`
	Entidad                               string  `json:"entidad"`
	TotalDistritos                        int     `json:"total_distritos"`
	ListaNominal                          int     `json:"lista_nominal"`
	VotosTotales                          int     `json:"votos_totales"`
	ParticipacionGeneralPct               float64 `json:"participacion_general_pct"`
	AbstencionismoGeneralPct              float64 `json:"abstencionismo_general_pct"`
	ParticipacionJovenPct                 float64 `json:"participacion_joven_pct"`
	AbstencionismoJovenPct                float64 `json:"abstencionismo_joven_pct"`
	BrechaAbstencionismoJovenVsGeneralPts float64 `json:"brecha_abstencionismo_joven_vs_general_pts"`
}

// DistritoVotante represents participation metrics of a specific federal electoral district.
type DistritoVotante struct {
	ID                       int     `json:"id"`
	EntidadID                int     `json:"entidad_id"`
	Entidad                  string  `json:"entidad"`
	DistritoID               int     `json:"distrito_id"`
	DistritoNombre           string  `json:"distrito_nombre"`
	ListaNominal             int     `json:"lista_nominal"`
	VotosTotales             int     `json:"votos_totales"`
	ParticipacionGeneralPct  float64 `json:"participacion_general_pct"`
	AbstencionismoGeneralPct float64 `json:"abstencionismo_general_pct"`
	ParticipacionJovenPct    float64 `json:"participacion_joven_pct"`
	AbstencionismoJovenPct   float64 `json:"abstencionismo_joven_pct"`
	DesgloseSexoJovenJSON    string  `json:"desglose_sexo_joven_json,omitempty"`
}

// PerfilVotanteRequest represents the incoming user profile payload.
type PerfilVotanteRequest struct {
	NombreAlias   string   `json:"nombre_alias"`
	Edad          int      `json:"edad"`
	Sexo          string   `json:"sexo"`
	EntidadID     int      `json:"entidad_id"`
	DistritoID    int      `json:"distrito_id"`
	Escolaridad   string   `json:"escolaridad"`
	PrioridadTema string   `json:"prioridad_tema"`
	Temas         []string `json:"temas,omitempty"`
}

// PerfilVotanteResponse represents voter profile stats and matching calculations.
type PerfilVotanteResponse struct {
	PerfilID                  int64    `json:"perfil_id"`
	NombreAlias               string   `json:"nombre_alias"`
	Edad                      int      `json:"edad"`
	Sexo                      string   `json:"sexo,omitempty"`
	EsJoven                   bool     `json:"es_joven"`
	EntidadID                 int      `json:"entidad_id"`
	Entidad                   string   `json:"entidad"`
	DistritoID                int      `json:"distrito_id,omitempty"`
	DistritoNombre            string   `json:"distrito_nombre,omitempty"`
	ParticipacionEsperadaPct  float64  `json:"participacion_esperada_pct"`
	AbstencionismoEsperadoPct float64  `json:"abstencionismo_esperado_pct"`
	ParticipacionJovenPct     float64  `json:"participacion_joven_pct"`
	AbstencionismoJovenPct    float64  `json:"abstencionismo_joven_pct"`
	BrechaAbstencionismoJoven float64  `json:"brecha_abstencionismo_joven_pts"`
	ParticipacionGeneroPct    *float64 `json:"participacion_genero_pct,omitempty"`
	MensajeParticipacion      string   `json:"mensaje_participacion"`
	TemasPrioritarios         []string `json:"temas_prioritarios,omitempty"`
}
