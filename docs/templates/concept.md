# QKV 


## What? 
QKV is a part of the AI [transformer](./todo-reference-transformer) architecture used to enable queries.

The idea is that given an input query (Q), there is some set of information that is a best match (K). 
Then the K matches to some set of values (V). 

For a given inference step X, the Q is evaluated against all previous [embeddings](ref-todo-embeddings) KV and attention evaluates the next value as a consequence. 

## Why? 
It allows us to separate the customer query/ with the embeddings for the query key and value key. that way we have separate presentations. 

It allows us to cache previous queries in a cache, that we can reuse for continutation rather than re-evaluating query keys. 


## references

TODO (in MLA form)
- format attention is all you need
- appropriate reference for IR QKV

## document history
### change -date (2nd june, 2026)
