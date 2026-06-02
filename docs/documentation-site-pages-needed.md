# Documentation Site Pages Needed

This document is the phased content roadmap for the AI model reference site.
The meta-planner should work one phase at a time and wait for manual review
before moving to the next phase through Phase 10. After Phase 10, the site
should have enough structure, validation, templates, and representative pages to
run long-tail expansion mostly autonomously.

Each phase should produce working pages, registry records, localized messages,
asset config, search coverage, related-document behavior, citations where
needed, and validation coverage appropriate for that phase.

## Page Candidate Shape

When promoting a topic into work, shape it like:

```txt
kind: module | model | concept | paper | training-regime | system | glossary | blog
slug:
priority: P0 | P1 | P2 | P3
phase:
tags:
aliases:
registryFields:
dependsOn:
relatedBy:
starterBatch:
notes:
```

## Phase 0: Factory And Planning Readiness

Goal: make the autonomous loop safe enough to start implementation work.

Pages:

* none

Required outcomes:

* root README explains the project, stack, content model, commands, and factory loop
* ideafy meta-planner instructions are explicit about current phase, state checks,
  session checks, batch submission, loopback work, and repair moves
* batch input example matches the canonical `FACTORY_REQUEST_BATCH` shape
* `factory/internal/progress.txt` and `factory/internal/checklist.md` exist
* `docs/architecture.md`, `docs/data-model.md`, and
  `docs/architectural-checklist.md` describe the implementation target
* this document has a clean phased roadmap with no unmapped raw backlog

Manual review gate:

* confirm the meta-planner can inspect state with `you work list`
* confirm the meta-planner can inspect sessions with `you session list`
* confirm the batch example validates with `you submit batch --dry-run`
* confirm Phase 1 can be submitted as 3-5 concrete `idea` work items

## Phase 1: Default Site And One Canonical Docs Page

Goal: prove the site works end to end with the smallest meaningful reference
surface.

Pages:

* home/reference entry page
* search page or search dialog entry
* glossary index page
* tags index page
* one tag landing page: attention
* one canonical module page: grouped-query attention
* one basic glossary page: token

Required outcomes:

* Next.js/Fumadocs app scaffold exists
* Bun, Biome, TypeScript, Tailwind, shadcn/ui, and Makefile commands exist
* docs route renders one canonical MDX page
* page-local `messages/en.json` and `assets.json` resolve
* one registry module record, one tag record, and one citation record exist
* Orama search can find the sample page by title, alias, tag, and body text
* related docs and tag pills render in basic form
* `make ci`, `make lint`, `make typecheck`, `make test`, and `make build` are
  defined

Manual review gate:

* open the app locally and confirm home, search, glossary, tag, and sample docs
  routes work
* confirm the sample page uses message keys rather than raw prose in canonical
  MDX
* confirm search finds `GQA`, `attention`, and `KV cache`

## Phase 2: Core Foundations

Goal: create the basic pages that make advanced pages readable.

Pages:

* token
* tensor
* embedding
* latent space
* logit
* softmax
* entropy
* temperature
* parameter
* activation
* computational graph
* gradient
* backpropagation
* loss function
* optimizer state
* model capacity
* overfitting
* generalization
* perplexity
* scaling law
* emergent behavior

Required outcomes:

* glossary and concept pages can be generated from templates
* foundational pages link to one another through derived relationships and tags
* basic math/code rendering works where needed
* search can distinguish glossary pages from module/model pages

Manual review gate:

* confirm a beginner can move from `token` to `embedding`, `logit`, and
  `softmax`
* confirm related docs explain why links appear

## Phase 3: Core Architectures And Components

Goal: cover the main model-building blocks and their nearby variants.

Pages:

* transformer
* attention
* self-attention
* cross-attention
* causal attention
* bidirectional attention
* multi-head attention
* multi-query attention
* grouped-query attention
* multi-head latent attention
* sparse attention
* sliding-window attention
* linear attention
* DeltaNet attention
* local attention
* global attention
* dilated attention
* block-sparse attention
* ring attention
* attention sinks
* feed-forward network
* standard FFN
* mixture of experts
* ReLU
* LeakyReLU
* SiLU
* SwiGLU
* normalization
* layer norm
* batch norm
* group norm
* RMSNorm
* QK norm
* residual connection
* skip connection
* positional encodings
* absolute positional embeddings
* learned positional embeddings
* sinusoidal positional embeddings
* relative position bias
* T5 relative position bias
* RoPE
* NoPE
* ALiBi
* SuperHOT RoPE
* NTK-aware RoPE scaling
* YaRN
* LongRoPE
* positional interpolation
* context window
* context extension
* why long context is hard
* tokenizers overview
* BPE
* WordPiece
* Unigram tokenizer
* SentencePiece
* byte-level tokenization
* vocabulary size
* special tokens
* chat templates
* tokenizer mismatch

Required outcomes:

* module templates support comparison tables and example architectures
* recursive module graph rendering works for a transformer block
* derived related docs group attention variants by `variantGroup`
* tag pages enumerate modules, concepts, and glossary entries by tag

Manual review gate:

* confirm MHA, MQA, GQA, MLA, sparse attention, and sliding-window attention
  compare correctly
* confirm the graph expands/collapses vertically on desktop and mobile

## Phase 4: Localization And Assetized Content Workflow

Goal: prove the structured-doc model works for more than English before content
volume becomes large.

Pages:

* localize all Phase 1 pages
* localize a representative subset of Phase 2 and Phase 3 pages
* add localized graph labels and captions for grouped-query attention
* add localized glossary labels for token, embedding, logit, softmax, and
  attention

Required outcomes:

* locale routing or locale selection works
* page-local `messages/<locale>.json` fallback behavior is defined
* missing translation validation exists
* asset alt text and captions resolve through localized message keys
* search can index localized titles, summaries, aliases, and body text
* canonical MDX structure remains shared across locales

Manual review gate:

* confirm English plus one non-English locale render correctly
* confirm missing translation failures are understandable
* confirm graph labels, alt text, captions, and search results localize

## Phase 5: Inference, Serving, Sampling, And Quantization

Goal: cover practical runtime behavior and why serving models is expensive.

Pages:

* KV cache
* KV cache memory
* KV cache eviction
* sliding-window KV cache
* paged KV cache
* KV cache quantization
* prefill
* decode
* prefill/decode split
* disaggregated prefill/decode
* time to first token
* inter-token latency
* tokens per second
* throughput vs latency
* continuous batching
* dynamic batching
* request scheduling
* prefix caching
* prompt caching
* paged attention
* chunked prefill
* FlashAttention
* Flash decoding
* FlashMLA
* fast attention
* speculative decoding
* draft model
* EAGLE
* Medusa
* n-gram speculative decoding
* model warmup
* CUDA graph capture
* kernel fusion
* sampling overview
* greedy decoding
* top-k sampling
* top-p sampling
* min-p sampling
* typical sampling
* beam search
* parallel sampling
* repetition penalty
* frequency penalty
* presence penalty
* contrastive decoding
* structured generation
* constrained decoding
* grammar-based decoding
* tool-call parsing
* logit bias
* stop sequences
* best-of sampling
* quantization overview
* INT8
* INT4
* FP8
* FP4
* BF16
* FP32
* FP64
* NF4
* MXFP4
* GPTQ
* AWQ
* SmoothQuant
* GGUF
* EXL2
* bitsandbytes 4-bit
* Q_K_M quantization
* activation quantization
* weight-only quantization
* quantization-aware training
* post-training quantization
* dynamic quantization
* calibration
* why 4-bit models are not exactly 4x faster

Required outcomes:

* systems pages and module pages share tags and related-document derivation
* search facets include `inference`, `quantization`, `sampling`, and `systems`
* practical benefit sections consistently explain latency, memory, and cost

Manual review gate:

* confirm a reader can follow `KV cache -> paged attention -> prefill/decode ->
  speculative decoding`
* confirm quantization pages explain tradeoffs without benchmark leaderboard
  framing

## Phase 6: Training, Data, Objectives, Optimization, And Regularization

Goal: cover how models are trained and why data/objectives matter.

Pages:

* next-token prediction
* masked language modeling
* causal language modeling
* span corruption
* instruction tuning loss
* preference loss
* cross entropy
* negative log likelihood
* mean squared error
* L1 loss
* Huber loss
* KL divergence
* contrastive loss
* triplet loss
* InfoNCE
* CTC loss
* diffusion denoising loss
* flow matching loss
* policy gradient loss
* reward model loss
* distillation loss
* advantage estimation
* reward modeling
* DPO
* PPO
* GRPO
* RLHF
* RLAIF
* RLVR
* on-policy distillation
* multi-parent distillation
* hybrid model mixing
* pretraining data
* instruction data
* preference data
* synthetic data
* data filtering
* data deduplication
* near-duplicate detection
* contamination
* train/test contamination
* benchmark leakage
* evaluation leakage
* curriculum learning
* mixture weighting
* data ablation
* data flywheel
* RL environment data
* human annotation
* weak supervision
* self-training
* dataset quality vs dataset quantity
* data governance
* licensing
* Adam
* AdamW
* why AdamW is not just Adam plus L2
* Muon
* SGD
* momentum
* Nesterov momentum
* Adafactor
* Lion
* Sophia
* Shampoo
* RMSProp
* learning rate schedules
* cosine decay
* warmup
* linear decay
* one-cycle schedule
* gradient clipping
* loss scaling
* mixed precision training
* numerical underflow
* numerical overflow
* softmax stability
* log-sum-exp trick
* exploding gradients
* vanishing gradients
* dropout
* weight decay
* early stopping
* label smoothing
* data augmentation
* stochastic depth
* DropPath
* Mixup
* CutMix
* noise injection
* gradient noise
* spectral normalization
* max-norm regularization
* L1 regularization
* L2 regularization
* weight tying
* teacher forcing
* scheduled sampling
* batch size as implicit regularization
* ensembling
* KL penalty
* entropy bonus
* reward clipping
* advantage normalization

Required outcomes:

* training-regime templates are exercised
* data pages can link to evaluation and safety concepts
* paper pages can introduce or support training regimes
* optimization pages can link to numerical stability and hardware constraints

Manual review gate:

* confirm DPO/PPO/GRPO comparison works
* confirm data contamination and benchmark leakage are easy to find from
  evaluation pages

## Phase 7: Model And Paper Families

Goal: add recognizable model and paper pages that exercise the registry.

Pages:

* GPT-2
* GPT-Nano
* GPT-OSS
* BERT
* T5
* PaLM
* Chinchilla
* Claude
* Gemini
* Llama family
* Llama 3
* Qwen family
* Qwen2
* Qwen2.5
* Qwen3
* DeepSeek family
* DeepSeek-V2
* DeepSeek-V3
* DeepSeek-R1
* Mistral
* Mixtral
* Gemma
* Nemotron
* Phi
* Yi
* GLM
* InternLM
* Command R
* Falcon
* OPT
* OLMo
* SmolLM
* MiniCPM
* Kimi K2.5
* encoder-only models
* decoder-only models
* encoder-decoder models
* autoregressive models
* masked language models
* sequence-to-sequence models
* retrieval-augmented generation models
* agentic models
* world models
* energy-based models
* autoencoders
* variational autoencoders
* GANs
* normalizing flows
* Code Llama
* StarCoder
* DeepSeek-Coder
* Qwen-Coder
* Codestral
* code repair models
* browser agents
* computer-use agents

Required outcomes:

* model pages render architecture summaries, modules, training regimes, papers,
  and related models
* paper pages render contributions, introduced modules/models, evidence, and
  citations
* model graphs treat models as root modules
* family pages group variants without becoming benchmark pages

Manual review gate:

* confirm GPT-2 links to transformer, causal attention, tokenization, and
  next-token prediction
* confirm model pages do not turn into benchmark pages

## Phase 8: Multimodal, Diffusion, Audio, And Video

Goal: expand beyond text LLMs while preserving the same module abstraction.

Pages:

* vision transformer
* patch embeddings
* ViT patchification
* CLIP
* CLIP-style contrastive embeddings
* BLIP
* BLIP-2
* Flamingo
* Kosmos
* LLaVA
* Qwen-VL
* Pixtral
* vision encoders
* projector layers
* image patch embeddings
* image tokenizers
* discrete image tokens
* VQ-VAE
* VQGAN
* latent diffusion autoencoders
* diffusion models
* DDPM
* DDIM
* latent diffusion
* Stable Diffusion
* Stable Diffusion XL
* Stable Diffusion 3
* Flux
* Imagen
* DALL-E
* Sora-style video diffusion
* DiT
* U-Net diffusion
* VAE in diffusion
* diffusion schedulers
* Euler sampler
* DPM-Solver
* consistency models
* classifier guidance
* classifier-free guidance
* classifier-free guidance dropout
* conditioning dropout
* augmentation regularization
* ControlNet
* IP-Adapter
* LoRA for diffusion
* temporal positions for video generation
* flow matching
* rectified flow
* diffusion vs path-finding optimization
* audio tokenizers
* EnCodec
* SoundStream
* Mimi
* DAC
* semantic audio tokens
* acoustic audio tokens
* residual vector quantization
* vector quantization
* finite scalar quantization
* mel spectrogram patch tokens
* CLAP
* Whisper
* Qwen-ASR
* StepFun-ASR
* Voxtral
* Moshi
* Orpheus
* OmniVoice
* wav2vec 2.0
* HuBERT
* WavLM
* Bark
* VALL-E
* CosyVoice
* Fish Speech
* Parakeet
* SeamlessM4T
* AudioPaLM
* Qwen-Audio
* Qwen-Omni
* audio-language alignment
* audio hallucination
* voice spoofing
* speaker privacy
* biometric leakage
* audio jailbreaks
* acoustic backdoors

Required outcomes:

* recursive module graph abstraction works for diffusion, image, and audio
  models, not only transformers
* multimodal tags and facets work
* graph labels and asset captions remain localizable
* modality-specific tokenizers still use the same data model

Manual review gate:

* confirm diffusion and audio pages use the same docs/data model rather than
  bespoke diagram logic

## Phase 9: Retrieval, Agents, Safety, And Evaluation

Goal: cover practical AI systems people build around models.

Pages:

* embeddings
* dense retrieval
* sparse retrieval
* BM25
* hybrid search
* reranking
* cross-encoder
* bi-encoder
* twin-tower model
* single-tower model
* late interaction
* ColBERT
* vector database
* approximate nearest neighbor search
* HNSW
* IVF
* product quantization
* chunking
* semantic chunking
* query rewriting
* HyDE
* reranker models
* context compression
* retrieval-augmented generation
* citation grounding
* hallucination reduction
* BGE-M3
* tool calling
* function calling
* structured outputs
* JSON mode
* ReAct
* chain-of-thought prompting
* tree-of-thought prompting
* self-consistency
* planning agents
* reflection
* memory systems
* short-term memory
* long-term memory
* vector memory
* agent harnesses
* MCP
* sandboxing
* constitutional AI
* helpfulness, harmlessness, and honesty
* reward hacking
* specification gaming
* jailbreaks
* prompt injection
* indirect prompt injection
* data poisoning
* model poisoning
* backdoors
* adversarial examples
* hallucination
* refusal behavior
* uncertainty estimation
* calibration
* red teaming
* guardrails
* content filtering
* model monitoring
* privacy leakage
* memorization
* differential privacy
* benchmark overview
* benchmark saturation
* benchmark contamination
* human eval vs automatic eval
* eval harnesses
* MMLU
* MMLU-Pro
* GPQA
* GSM8K
* MATH
* AIME
* HumanEval
* MBPP
* Big-Bench Hard
* IFEval
* LiveBench
* Chatbot Arena
* MT-Bench
* AlpacaEval
* HELM
* SWE-bench
* SWE-bench Verified
* SWE-bench Multimodal
* SWE-bench Lite
* OSWorld
* WebArena
* tau-bench
* terminal-bench
* MMMU
* MathVista
* ChartQA
* DocVQA
* VQAv2
* AudioBench
* WER
* CER
* FID
* CLIP score
* aesthetic score
* human preference eval
* temporal consistency for video
* recall@k
* MRR
* nDCG
* hit rate

Required outcomes:

* evaluation pages are explanatory and do not become benchmark leaderboards
* safety and reliability pages link to relevant training/data/evaluation pages
* retrieval and agent pages share system tags with serving pages
* benchmark pages explain use and caveats rather than ranking models

Manual review gate:

* confirm tag pages show cross-category resources for `retrieval`, `agents`,
  `evaluation`, and `safety`

## Phase 10: Hardware, Distributed Systems, And Kernels

Goal: explain why model training and inference behave the way they do on real
hardware.

Pages:

* GPU
* TPU
* NPU
* CPU
* unified memory
* GDDR
* GDDR7
* HBM
* SRAM
* CPU RAM
* registers
* shared memory
* L1 cache
* L2 cache
* PCIe
* NVLink
* NVSwitch
* InfiniBand
* RDMA
* network fabric
* tensor cores
* CUDA cores
* SM
* warp
* wavefront
* thread block
* threadgroup
* memory barrier
* occupancy
* register pressure
* shared memory bank conflicts
* coalesced memory access
* memory bandwidth
* memory-bound workload
* compute-bound workload
* latency-bound workload
* arithmetic intensity
* roofline model
* FLOPs vs FLOP/s
* batch size and hardware utilization
* numbers to remember for GPU latency and bandwidth
* GEMM
* matmul tiling
* epilogue fusion
* persistent kernels
* split-K
* kernel counters vs synchronization
* CUDA graphs
* Triton
* CUTLASS
* Metal Performance Shaders
* omnikernels
* tiling
* data parallelism
* tensor parallelism
* pipeline parallelism
* sequence parallelism
* expert parallelism
* context parallelism
* FSDP
* ZeRO
* DeepSpeed
* Megatron-LM
* activation checkpointing
* gradient accumulation
* gradient clipping
* all-reduce
* reduce-scatter
* all-gather
* NCCL
* stragglers
* elastic training
* training memory breakdown
* parameters memory
* gradients memory
* optimizer states memory
* activations memory
* Cerebras wafer-scale systems
* Groq wafer-scale systems

Required outcomes:

* systems pages support diagrams and numeric reference tables
* hardware pages link back to inference and distributed-training pages
* PDF output handles tables, diagrams, and citations cleanly
* by the end of this phase, the site has representative coverage for every
  major content kind and can expand autonomously

Manual review gate:

* confirm memory hierarchy and batching pages explain latency/cost tradeoffs in
  plain language
* confirm the meta-planner can safely start autonomous long-tail expansion

## Phase 11: Autonomous Backfill, Governance, And Long-Tail Expansion

Goal: turn the site from a seed reference into a maintained encyclopedia.
After Phase 10 passes manual review, this phase may run mostly autonomously in
small batches.

Work:
* does research as is appropriate and tries to find new papers on arxiv, hackernews, wherever else is appropriate.  
* backfill remaining model pages as new models, papers, and techniques appear
* add pages for newly discovered modules, papers, datasets, systems ideas, and
  training regimes
* add freshness and last-reviewed metadata
* add source review rules for technical claims
* add SEO metadata and sitemap coverage
* add content quality review workflows
* periodically review tags for duplication and drift
* periodically review related-document derivation quality
* periodically review localization gaps

Manual review gate:
* at the autonomous phase, there is basically no submitted work, the system just scrounges data and processes things itself. 
