# MultiBaas Go SDK example

To run this code example you will first need to [generate an API key](https://docs.curvegrid.com/multibaas/api/generate-api-keys/) in the `DApp User` group for your MultiBaas deployment. 

Once you have generated an API key you can export the key and the MultiBaas deployment hostname into environment variables. Example:
```sh
export MB_HOSTNAME="your_deployment.multibaas.com"
export MB_API_KEY="secret"
```

To run the example:
```sh
go run .
```
