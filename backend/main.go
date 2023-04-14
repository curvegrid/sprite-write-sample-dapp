package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/curvegrid/gofig"
	multibaas "github.com/curvegrid/multibaas-sdk-go"
)

const chain = "ethereum"

type MintRequest struct {
	Colors  string `json:"colors"`
	Address string `json:"address"`
}

// writeCORSHeaders writes CORS headers to allow connections from anywhere
// not recommended for production as-is
func writeCORSHeaders(w http.ResponseWriter) {
	w.Header().Add("Connection", "keep-alive")
	w.Header().Add("Access-Control-Allow-Methods", "POST, OPTIONS, GET, DELETE, PUT")
	w.Header().Add("Access-Control-Allow-Headers", "content-type")
	w.Header().Add("Access-Control-Max-Age", "0")
}

// Config stores configuration parameters
type Config struct {
	ServeFiles bool            `flag:"serveFiles" desc:"enable serving frontend files"`
	FilesPath  string          `flag:"filespath" desc:"path to the web home directory"`
	Bind       string          `flag:"bind" desc:"IP address and/or port to bind to"`
	MultiBaas  MultiBaasConfig `json:"multibaas" desc:"MultiBaas configuration"`
}

// MultiBaasConfig stores MultiBaas configuration parameters
type MultiBaasConfig struct {
	Endpoint   string `json:"endpoint"`
	APIKey     string `json:"apiKey"`
	HSMAddress string `json:"hsmAddress"`
}

func main() {
	// Default configuration
	cfg := Config{
		FilesPath: "../frontend/dist",
		Bind:      ":6789",
	}

	// Load configuration from environment variables and/or config file
	gofig.SetEnvPrefix("SW")
	gofig.SetConfigFileFlag("c", "config file")
	gofig.AddConfigFile("spritewrite") // gofig will try to load spritewrite.json, spritewrite.toml and spritewrite.yaml
	gofig.Parse(&cfg)

	// Initialize the SDK
	conf := multibaas.NewConfiguration()
	client := multibaas.NewAPIClient(conf)

	// Configure the SDK using environment variables
	ctx := context.Background()
	ctx = context.WithValue(ctx, multibaas.ContextServerVariables, map[string]string{
		"base_url": cfg.MultiBaas.Endpoint,
	})
	ctx = context.WithValue(ctx, multibaas.ContextAccessToken, cfg.MultiBaas.APIKey)

	hsmAddress := cfg.MultiBaas.HSMAddress

	// Mint NFTs endpoint
	http.HandleFunc("/mint", func(w http.ResponseWriter, r *http.Request) {
		// Handle CORS preflight requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			writeCORSHeaders(w)
			w.WriteHeader(http.StatusOK)
			log.Println("Preflight request")
			return
		}

		// POST requests only
		if r.Method != http.MethodPost {
			http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
			log.Printf("Invalid request method: %s", r.Method)
			return
		}

		// Read the request body
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusInternalServerError)
			log.Printf("Error reading request body: %s", err.Error())
			return
		}

		log.Printf("Mint request: %s", string(body))

		// Unmarshal the request body
		var mintRequest MintRequest
		err = json.Unmarshal(body, &mintRequest)
		if err != nil {
			http.Error(w, "Error unmarshalling JSON", http.StatusBadRequest)
			log.Printf("Error unmarshalling JSON: %s", err.Error())
			return
		}

		// Prepare the request to the smart contract
		signAndSubmit := true
		payload := multibaas.PostMethodArgs{
			Args: []interface{}{
				mintRequest.Colors,
				mintRequest.Address,
			},
			SignAndSubmit: &signAndSubmit,
			From:          &hsmAddress,
		}
		payloadJSON, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			panic(err)
		}
		log.Printf("Payload: %s", string(payloadJSON))

		// Call the smart contract via the MultiBaas SDK
		resp, _, err := client.ContractsApi.CallContractFunction(ctx, chain, "sprite_write", "sprite_write", "safeMint").PostMethodArgs(payload).Execute()
		if err != nil {
			http.Error(w, "Error minting NFT", http.StatusInternalServerError)
			log.Printf("Error minting NFT: %s", err.Error())
			return
		}

		// Log the transaction hash
		txHash := *resp.Result.TransactionToSignResponse.Tx.Hash
		log.Printf("Mint successful, tx hash: %+v", txHash)

		// Return the transaction hash
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"txHash":"` + txHash + `"}`))
	})

	// Optionally serve frontend files
	if cfg.ServeFiles {
		log.Printf("Serving files from '%s'", cfg.FilesPath)
		http.Handle("/", http.FileServer(http.Dir(cfg.FilesPath)))
	}

	log.Println("Starting server on", cfg.Bind)
	log.Fatal(http.ListenAndServe(cfg.Bind, nil))
}
