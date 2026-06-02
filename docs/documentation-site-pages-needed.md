
# topics of interest

## models overall

## modules/ components
mxfp4

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

## caching
- KV cachine
- tea cache
- sage attention

## diffuser concepts
- classifier free guidance
- classifier guidance
- flow matching
- diffuser steps
- LORA
- controlNET
- ipadapter
- temporalpositions for video generation
## modules
- istft
- fourier transformations
- rnn
- LSTM
- CNN

## regularization techniques
- dropout
- weight decay
- early stopping
- 
- normalization

- generator/discriminator

- loss function

- twin tower versus single tower


## training
- on policy distillatoin
- multi parent distillation
- hybrid model mixing 
- distillation

## sampling
- top P
- top K
- 1 hot

## numerical presentations
- fp4
- bf16
- fp32
- fp64

## model pages needed

- deep seek
- qwen3.6
- GPT-OSS
- GPT-2
- GPT-Nano
- VOXTRAL
- mistral
- llama
- llama3
- kimi-k2.5
- gemma
- nemotron
- stable diffusion
- anima
- super
- z image base
- orpheus
- omnivoice
- qwen-asr
- mimi
- moshi
- stepfun-asr
- whisper
- CLIP
- bge-m3

- encoder-only models
- decoder-only models
- encoder-decoder models
- autoregressive models
- masked language models
- causal language modeling
- sequence-to-sequence models
- retrieval-augmented generation
- agentic models
- world models
- energy-based models
- autoencoders
- variational autoencoders
- GANs
- normalizing flows
- flow matching

±## additionals

Big missing categories
1. Model architecture primitives

You have transformers, SSMs, FFNs, MoE, attention, etc. I’d also add:

- encoder-only models
- decoder-only models
- encoder-decoder models
- autoregressive models
- masked language models
- causal language modeling
- sequence-to-sequence models
- retrieval-augmented generation
- agentic models
- world models
- energy-based models
- autoencoders
- variational autoencoders
- GANs
- normalizing flows

Especially for a reference site, encoder-only / decoder-only / encoder-decoder should be top-level pages because they explain why BERT, GPT, T5, Whisper, CLIP, diffusion models, and ASR systems feel so different.

2. Attention variants you should add

Your attention section is good, but I’d add these:

- self-attention
- cross-attention
- causal attention
- bidirectional attention
- multi-head attention
- multi-query attention, MQA
- grouped-query attention, GQA
- local attention
- global attention
- dilated attention
- block-sparse attention
- ring attention
- paged attention
- flash attention
- flash decoding
- prefix attention
- attention sinks
- sink tokens
- ALiBi
- YaRN
- LongRoPE
- NTK-aware RoPE scaling
- context extension

You already have MLA and latent compression, which is good. I’d separate:

KV reduction techniques:
- MQA
- GQA
- MLA
- KV cache quantization
- KV cache eviction
- sliding-window KV cache
- paged KV cache
- prefix caching

PagedAttention, prefix caching, chunked prefill, continuous batching, optimized attention kernels, speculative decoding, and disaggregated prefill/decode are now mainstream inference-server concepts, so I’d make them dedicated systems pages, not just attention footnotes. vLLM’s docs list these as core LLM serving features, alongside FlashAttention, FlashInfer, FlashMLA, CUDA/HIP graphs, quantization, and distributed inference modes.

3. Positional encoding / context length

You have RoPE, SuperHOT RoPE, and NoPE. Add:

- absolute positional embeddings
- learned positional embeddings
- sinusoidal positional embeddings
- ALiBi
- relative position bias
- T5 relative position bias
- RoPE scaling
- NTK scaling
- YaRN
- LongRoPE
- positional interpolation
- context window
- context extrapolation
- context compression

Also add a page for:

Why long context is hard

That page can connect attention complexity, KV cache memory, RoPE scaling, retrieval, summarization, and context distillation.

4. Tokenization

This is a major gap. Add a whole section:

Text tokenizers:
- BPE
- WordPiece
- Unigram tokenizer
- SentencePiece
- byte-level tokenization
- tiktoken-style tokenization
- vocabulary size
- special tokens
- chat templates
- tokenizer mismatch

Image tokenizers:
- VQ-VAE
- VQGAN
- patch embeddings
- ViT patchification
- discrete image tokens
- latent diffusion autoencoders

Audio tokenizers:
- EnCodec
- SoundStream
- Mimi
- DAC
- semantic tokens
- acoustic tokens
- residual vector quantization
- finite scalar quantization

For your site, tokenization should probably be one of the main categories because it connects text, image, audio, multimodal models, and latency.

5. Training objectives / losses

You mention “loss function,” but this deserves a whole area.

Core losses:
- cross entropy
- negative log likelihood
- mean squared error
- L1 loss
- Huber loss
- KL divergence
- contrastive loss
- triplet loss
- InfoNCE
- CTC loss
- diffusion denoising loss
- flow matching loss
- policy gradient loss
- reward model loss
- distillation loss

For LLMs specifically:

- next-token prediction
- masked language modeling
- span corruption
- instruction tuning loss
- preference loss
- DPO loss
- PPO objective
- GRPO objective
- reward modeling
- advantage estimation

For multimodal:

- image-text contrastive loss
- audio-text contrastive loss
- alignment loss
- reconstruction loss
- perceptual loss
6. Datasets and data pipelines

This is another big missing category.

- pretraining data
- instruction data
- preference data
- synthetic data
- data filtering
- data deduplication
- near-duplicate detection
- contamination
- benchmark leakage
- curriculum learning
- mixture weighting
- data ablation
- data flywheel
- RL environment data
- human annotation
- weak supervision
- self-training

Also add pages for:

- dataset quality vs dataset quantity
- train/test contamination
- evaluation leakage
- data governance
- licensing

For an ML reference site, “data contamination” and “benchmark leakage” are especially important because they explain why modern benchmarks become unreliable over time. LiveBench was explicitly designed to reduce contamination by using frequently updated questions, objective scoring, and tasks across math, coding, reasoning, language, instruction-following, and data analysis.

7. Inference / serving systems

You already have latency optimization and hardware topics, but I’d create a full LLM serving section:

- prefill
- decode
- time to first token, TTFT
- inter-token latency, ITL
- tokens per second
- throughput vs latency
- continuous batching
- dynamic batching
- request scheduling
- prefix caching
- prompt caching
- paged attention
- chunked prefill
- speculative decoding
- draft model
- Medusa
- EAGLE
- n-gram speculative decoding
- beam search
- parallel sampling
- structured generation
- constrained decoding
- grammar-based decoding
- tool-call parsing
- disaggregated prefill/decode
- model warmup
- CUDA graphs
- graph capture
- kernel fusion

Speculative decoding deserves its own page. The core idea is that a smaller draft model proposes several future tokens, then the larger target model verifies them in parallel, reducing autoregressive latency.

8. Distributed training

You have some distributed inference/training pieces, but I’d add:

- data parallelism
- tensor parallelism
- pipeline parallelism
- sequence parallelism
- expert parallelism
- context parallelism
- ZeRO
- FSDP
- DeepSpeed
- Megatron-LM
- activation checkpointing
- gradient accumulation
- gradient clipping
- all-reduce
- reduce-scatter
- all-gather
- NCCL
- RDMA
- InfiniBand
- NVLink
- NVSwitch
- stragglers
- elastic training

Also add:

Training memory breakdown:
- parameters
- gradients
- optimizer states
- activations
- KV cache, for inference

That page would be very useful.

9. Optimization / numerical stability

You listed Adam, AdamW, Muon. Add:

- SGD
- momentum
- Nesterov momentum
- Adafactor
- Lion
- Sophia
- Shampoo
- RMSProp
- learning rate schedules
- cosine decay
- warmup
- linear decay
- one-cycle schedule
- gradient clipping
- loss scaling
- mixed precision training
- numerical underflow
- numerical overflow
- softmax stability
- log-sum-exp trick
- exploding gradients
- vanishing gradients

Also add a dedicated page for:

Why AdamW is not just Adam + L2

That one is great for SEO and useful for beginners.

10. Regularization techniques

Your current list:

dropout
weight decay
early stopping
normalization

Add:

- label smoothing
- data augmentation
- stochastic depth
- DropPath
- Mixup
- CutMix
- noise injection
- gradient noise
- spectral normalization
- max-norm regularization
- L1 regularization
- L2 regularization
- weight tying
- teacher forcing
- scheduled sampling
- batch size as implicit regularization
- ensembling

For diffusion/image/video:

- classifier-free guidance dropout
- conditioning dropout
- augmentation regularization

For RL/RLHF:

- KL penalty
- entropy bonus
- reward clipping
- advantage normalization
Important model families to add

Your model page list is good, but I’d add pages by family and role.

LLMs
- BERT
- T5
- PaLM
- Chinchilla
- Claude
- Gemini
- Mistral/Mixtral
- Phi
- Yi
- GLM
- InternLM
- Command R
- Falcon
- OPT
- OLMo
- SmolLM
- MiniCPM
- DeepSeek-V2/V3/R1
- Qwen2/Qwen2.5/Qwen3
Coding / agent models
- Code Llama
- StarCoder
- DeepSeek-Coder
- Qwen-Coder
- Codestral
- SWE-agent-style systems
- code repair models
- browser agents
- computer-use agents

SWE-bench should be a dedicated evaluation page because it is now one of the standard software-engineering agent benchmarks, with variants like Verified, Multilingual, Lite, and Multimodal.

Vision / multimodal
- ViT
- LLaVA
- BLIP / BLIP-2
- Flamingo
- Kosmos
- Qwen-VL
- Pixtral
- Gemini-style multimodal models
- vision encoders
- projector layers
- image patch embeddings
Speech / audio
- wav2vec 2.0
- HuBERT
- WavLM
- EnCodec
- SoundStream
- Bark
- VALL-E
- CosyVoice
- Fish Speech
- Parakeet
- SeamlessM4T
- AudioPaLM
- Qwen-Audio
- Qwen-Omni

Large audio language models deserve a dedicated section beyond ASR/TTS. Recent audio-LLM surveys separate topics like audio-language alignment, hallucination, robustness, safety, privacy leakage, fairness, authentication, audio jailbreaks, and acoustic backdoors.

Diffusion / image / video
- DDPM
- DDIM
- latent diffusion
- Stable Diffusion XL
- Stable Diffusion 3
- Flux
- Imagen
- DALL-E
- Sora-style video diffusion
- DiT
- U-Net diffusion
- VAE in diffusion
- schedulers / samplers
- Euler sampler
- DPM-Solver
- consistency models
- rectified flow
Missing “explainer” pages I would definitely add

These are the pages that make the reference actually useful.

- What is a parameter?
- What is an activation?
- What is a tensor?
- What is a token?
- What is an embedding?
- What is a latent space?
- What is a logit?
- What is softmax?
- What is perplexity?
- What is temperature?
- What is entropy?
- What is a gradient?
- What is backpropagation?
- What is a computational graph?
- What is an optimizer state?
- What is model capacity?
- What is overfitting?
- What is generalization?
- What is scaling law?
- What is emergent behavior?

Also add comparison pages:

- Transformer vs RNN
- Transformer vs SSM
- Mamba vs attention
- MoE vs dense model
- LoRA vs full fine-tuning
- DPO vs PPO vs GRPO
- RLHF vs RLAIF vs RLVR
- diffusion vs autoregressive generation
- CLIP vs BLIP
- encoder-only vs decoder-only
- batch norm vs layer norm vs RMSNorm
- MHA vs MQA vs GQA vs MLA

Comparison pages are very good for SEO and for users trying to form mental models.

Evaluation section to add

You have “evaluation” under multimodal, but I’d make it top-level.

General LLM evals:
- MMLU
- MMLU-Pro
- GPQA
- GSM8K
- MATH
- AIME
- HumanEval
- MBPP
- Big-Bench Hard
- IFEval
- LiveBench
- Chatbot Arena / LMSYS Arena
- MT-Bench
- AlpacaEval
- HELM

Agent/code evals:
- SWE-bench
- SWE-bench Verified
- SWE-bench Multimodal
- OSWorld
- WebArena
- τ-bench / tau-bench
- terminal-bench
- browser-use evals

Multimodal evals:
- MMMU
- MathVista
- ChartQA
- DocVQA
- VQAv2
- AudioBench
- speech recognition WER/CER

Diffusion evals:
- FID
- CLIP score
- aesthetic score
- human preference eval
- temporal consistency for video

Retrieval evals:
- recall@k
- MRR
- nDCG
- hit rate

Also add meta-pages:

- why benchmarks saturate
- benchmark contamination
- human eval vs automatic eval
- eval harnesses
- red teaming
Retrieval / embeddings / RAG

You mention twin tower vs single tower and CLIP/BGE-M3, but I’d add a full retrieval category:

- dense retrieval
- sparse retrieval
- BM25
- hybrid search
- reranking
- cross-encoders
- bi-encoders
- late interaction / ColBERT
- vector databases
- approximate nearest neighbor search
- HNSW
- IVF
- PQ
- chunking
- semantic chunking
- query rewriting
- HyDE
- reranker models
- context compression
- retrieval-augmented generation
- citation grounding
- hallucination reduction

This category is very practical and will attract builders.

Agents / tool use

Since your site seems partly aimed at modern ML systems, add:

- tool calling
- function calling
- structured outputs
- JSON mode
- constrained decoding
- ReAct
- chain-of-thought prompting
- tree-of-thought
- self-consistency
- planning agents
- reflection
- memory systems
- short-term memory
- long-term memory
- vector memory
- computer-use agents
- browser agents
- code agents
- MCP
- agent harnesses
- sandboxing
- evals for agents

For your audience, “agent harness” and “MCP” pages could be especially useful.

Safety / alignment / reliability

You have RLHF/RLAIF/RLVR, but I’d add:

- constitutional AI
- harmlessness/helpfulness/honesty
- reward hacking
- specification gaming
- jailbreaks
- prompt injection
- indirect prompt injection
- data poisoning
- model poisoning
- backdoors
- adversarial examples
- hallucination
- refusal behavior
- uncertainty estimation
- calibration
- red teaming
- guardrails
- content filtering
- model monitoring
- privacy leakage
- memorization
- differential privacy

For audio/multimodal models, include:

- audio jailbreaks
- voice spoofing
- speaker privacy
- biometric leakage
- deepfake detection
Hardware / systems additions

Your systems list is great. I’d add more concrete pages:

Memory hierarchy:
- registers
- shared memory / SRAM
- L1 cache
- L2 cache
- HBM
- GDDR
- unified memory
- CPU RAM
- PCIe
- NVLink
- network fabric

GPU execution:
- SM / streaming multiprocessor
- warp
- wavefront
- thread block / threadgroup
- occupancy
- register pressure
- shared memory bank conflicts
- coalesced memory access
- tensor cores
- CUDA cores
- memory-bound vs compute-bound
- roofline model

Kernel concepts:
- GEMM
- matmul tiling
- epilogue fusion
- persistent kernels
- split-K
- reduce-scatter
- all-reduce
- CUDA graphs
- Triton
- CUTLASS
- Metal Performance Shaders

Also add:

- arithmetic intensity
- FLOPs vs FLOP/s
- bandwidth-bound workloads
- latency-bound workloads
- batch size and hardware utilization

These are the pages that will help explain why inference is slow.

Quantization additions

You have Q_K_M and bitsandbytes 4-bit. Add:

- INT8
- INT4
- FP8
- FP4
- NF4
- MXFP4
- GPTQ
- AWQ
- SmoothQuant
- GGUF
- EXL2
- activation quantization
- weight-only quantization
- KV cache quantization
- quantization-aware training
- post-training quantization
- dynamic quantization
- calibration

Also add a page:

Why 4-bit models are not exactly 4x faster

That would be a good practical explainer.

Fine-tuning / adaptation

You have LoRA. Add:

- full fine-tuning
- partial fine-tuning
- freeze/unfreeze
- LoRA
- QLoRA
- DoRA
- AdaLoRA
- prefix tuning
- prompt tuning
- adapters
- PEFT
- task vectors
- model merging
- SLERP
- DARE
- TIES merging
- adapter routing
- multi-LoRA serving
Sampling / decoding additions

You have top-p, top-k, one-hot. Add:

- greedy decoding
- beam search
- temperature
- min-p sampling
- typical sampling
- repetition penalty
- frequency penalty
- presence penalty
- contrastive decoding
- speculative decoding
- constrained decoding
- grammar decoding
- logit bias
- stop sequences
- best-of sampling
Suggested top-level site structure

I’d organize it like this:

1. Fundamentals
   tensors, gradients, loss, backprop, embeddings, logits, softmax

2. Architectures
   transformers, RNNs, CNNs, SSMs, diffusion, GANs, autoencoders, MoE

3. Components
   attention, FFN, normalization, positional encoding, tokenizers, activations

4. Training
   objectives, optimizers, regularization, data, distributed training, RLHF

5. Inference & Serving
   KV cache, batching, prefill/decode, sampling, speculative decoding, quantization

6. Multimodal
   vision, audio, video, tokenizers, cross-attention, shared embeddings

7. Retrieval & Agents
   embeddings, RAG, vector DBs, tool calling, agent loops, memory

8. Hardware & Systems
   GPU, TPU, NPU, memory hierarchy, kernels, parallelism, bandwidth

9. Evaluation
   benchmarks, metrics, contamination, human eval, agent evals

10. Model Pages
   GPT, Llama, Qwen, DeepSeek, Mistral, Gemma, Whisper, CLIP, Stable Diffusion, etc.
The biggest gaps in your current list

The most important things I’d add first are:

1. Tokenization
2. Loss functions / objectives
3. Evaluation benchmarks
4. Data pipelines and contamination
5. Inference serving: prefill/decode, batching, speculative decoding
6. Retrieval / RAG
7. Fine-tuning beyond LoRA
8. Distributed training memory math
9. Safety / prompt injection / red teaming
10. Basic explainers: tensor, logits, softmax, gradients, embeddings

Your existing list is already very modern. The main improvement is to add the boring foundational pages that let people understand the advanced pages. A reference site with MLA, Mamba, GRPO, FP4, FlashAttention, and KV cache is great — but users also need pages for what is a logit, why softmax exists, what a token is, and why memory bandwidth matters.