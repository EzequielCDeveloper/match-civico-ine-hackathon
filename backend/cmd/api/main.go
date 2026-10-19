package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"app/internal/candidatos"
	"app/internal/common"
	"app/internal/sistema"
	"app/internal/votantes"
)

func main() {
	// 1. Initialize SQLite Database Pool
	db := common.InitDB()
	defer db.Close()

	// 2. Global Router & Middlewares
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(common.CorsMiddleware)

	// Root Healthcheck
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		common.RespondJSON(w, http.StatusOK, map[string]string{
			"status": "ok",
			"app":    "Match Civico API v1",
		})
	})

	// 3. API v1 Mount Point (Modular Registration)
	// Isolation Rule: To disable a module, comment its line below.
	r.Route("/api/v1", func(r chi.Router) {
		candidatos.RegisterRoutes(r, db) // Luis: Candidatos y Filtrado
		votantes.RegisterRoutes(r, db)   // Ezequiel: Votantes y Estadisticas
		sistema.RegisterRoutes(r, db)    // Juan: Reset y Exportar PDF
	})

	port := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	log.Printf("Server running on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
