Presume that attestation.verify method has no vulnerabilities 

Main things to look for in this project is
- An agent cannot register in tee mode if it doesnt have a correct attestation. 
- An agent cannot call the request_signature function if it doesnt have a currently approved ppid and measurements
- The same as the two above for local but it also requires it to be whitelisted 