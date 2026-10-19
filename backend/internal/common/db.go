package common

import (
	"database/sql"
	"log"
	"os"

	_ "modernc.org/sqlite"
)

// InitDB initializes and returns the SQLite database connection pool.
func InitDB() *sql.DB {
	dbPath := resolveDBPath()

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("Failed to open SQLite database at %s: %v", dbPath, err)
	}

	// Optimize SQLite for concurrent reading and single-writer concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		log.Printf("Warning: Could not enable WAL journal mode: %v", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys=ON;"); err != nil {
		log.Printf("Warning: Could not enable foreign keys: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping SQLite database: %v", err)
	}

	log.Printf("SQLite database connected successfully: %s", dbPath)
	return db
}

func resolveDBPath() string {
	if envPath := os.Getenv("DB_PATH"); envPath != "" {
		return envPath
	}

	candidatePaths := []string{
		"data/matchcivico.db",
		"backend/data/matchcivico.db",
		"../db/matchcivico.db",
		"../../db/matchcivico.db",
		"db/matchcivico.db",
	}

	for _, p := range candidatePaths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}

	// Default fallback
	return "data/matchcivico.db"
}
