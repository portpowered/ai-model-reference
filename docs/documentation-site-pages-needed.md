
# topics of interest

## models overall

## modules/ components

### Attention

- RELU
- LeakyRELU
- SILU
- SWIGLU
- deltanet attention
- linear attention
- MLA
- sparse attention
- sliding window attention

### normalization
- RMSNORM
- QKNORM

### Concepts
- kv caches

### efficiency methods
- Multi token prediction (MTP)
### feed forward
- standard FFN
- MoE


### compute layers
- mamba/ssms
- rwkva
- gated delta net
- transformers
- hybrid ssm/full attentino
- diffusion transformers
- diffusion vs path finding optimization

### optimizers
- muon optimizers
- adam optimizers
- adamW

### quantization techniques
- Q_K_M
- 4bnb

### latency optimizations
- fast attention


### weight modification
- LORA

### Training techniques
- RLHF
- RLVR
- RLAIF

#### training regimes
- DPO
- PPO
- GRPO

### KV 
- standard MHA
- latent compresshion of attention (Deepseek side)
- grouped query attention

### embedding postiions
- ROPE
- superhot rope
- NOPE
### multimodal encoding

#### evaluation
- cross attention
- shared embeddings layer

#### image tokenizers
- CLIP
- path tokens

#### audio tokenizers

- contrastive embeddings (CLAP)
- mel spectrograms/patch tokens
- vector quantizers
- residual vector quantizers
- finite state quantizers

### systems concepts

- threads
- warps
- threadgroups
- memory barriers

- sram
- hbm
- memory bandwitdh

- numbers to remember (GPU memory, bandwidth, L1/L2 GPU latency, PCIE latency, NVLink latency)
### multi CPU/GPU optimize

- tensor parallelism
- NVLINK
- expert paralleism
- FSDP
- pipelining
- omnikernels
- tiling
- kernel counters vs synchronization
- 

## hardware
- NPU
- GPU
- TPU
- CPU
- Unified memory
- tensor cores
- cerebras/groq uniwafers

- GDDR7

## bidirectionality
- timestep alignment
- mimi/moshi

## training

synthetic data generation


## explainer

transformers
diffusers
QKV
FFNs
layer norm
batch norm
group norm

reasoning
skip connections
u nets


## connections
- residual connnection
- mhc