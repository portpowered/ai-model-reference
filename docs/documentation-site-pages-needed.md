# Model Atlas Pages Needed

This document defines the content structure for Model Atlas as a set of
parallel, end-to-end subject bundles.

The site should not be planned as a long serial phase ladder. Readers do not
arrive by phase. They arrive with a subject in mind:

* "I want to understand ChatGPT-style systems"
* "I want to understand Stable Diffusion"
* "I want to understand attention variants"
* "I want to understand how inference serving works"

The roadmap should therefore be organized around complete reader journeys.
Every subject bundle should contain the connected set of pages, models,
modules, concepts, glossary terms, papers, training regimes, and systems pages
that make that subject understandable end to end.

Work should be parallel by default. Different bundles can advance at the same
time when they do not collide on the same files or implementation surface.

## How To Use This Document

Use this document in three passes:

1. Choose a subject bundle based on the customer or reader need.
2. Use the grouping and tag rules below to classify every page candidate.
3. Build or reconcile the bundle as a connected slice rather than adding loose
   isolated pages.

## Overall Content Structure

The site has three planning layers:

* **Page kind**: what kind of page this is
* **Grouping**: the structured family the page belongs to
* **Tag**: the controlled discovery label used by search and tag landing pages

Every canonical page should declare all three.

## Canonical Page Kinds

Use these page kinds:

* `glossary`
* `concept`
* `module`
* `model`
* `paper`
* `training-regime`
* `system`
* `blog`

### Page-kind intent

* `glossary`: compact prerequisite definitions that unlock deeper pages
* `concept`: broad ideas that span many implementations
* `module`: named building blocks that appear inside models or systems
* `model`: a specific model family or release
* `paper`: a specific publication and its contributions
* `training-regime`: a named training or post-training method
* `system`: a serving, runtime, deployment, or operational system design
* `blog`: narrative or time-bound writing that links back to canonical docs

### Classification rules

Use `module` when the topic is a replaceable architecture component or named
building block.

Default these to `module` unless there is a strong documented reason not to:

* attention variants
* normalization variants
* feed-forward block variants
* activation modules when treated as stack components
* positional encoding mechanisms
* tokenizer algorithms
* inference optimization components

Examples:

* `RMSNorm` -> `module`
* `BatchNorm` -> `module`
* `GroupNorm` -> `module`
* `QK Norm` -> `module`
* `SwiGLU` -> `module`
* `Standard FFN` -> `module`
* `RoPE` -> `module`
* `ALiBi` -> `module`

Use `concept` when the page is about the broad idea across many
implementations.

Examples:

* `attention` -> `concept`
* `normalization` -> `concept`
* `activation` -> `concept`
* `architecture` -> `concept`
* `alignment` -> `concept`

Use `glossary` when the page is mainly a prerequisite term, quantity, or
object.

Examples:

* `token` -> `glossary`
* `logit` -> `glossary`
* `tensor` -> `glossary`
* `parameter` -> `glossary`
* `context window` -> `glossary`

Tie-breakers:

* if the page is about the general idea across many implementations, use
  `concept`
* if the page is about one named implementation a model may include, use
  `module`
* if a topic could be either `glossary` or `module`, prefer `module` when it is
  a replaceable architecture component
* if the site needs both a broad explainer and a specific implementation page,
  create both pages

## Page Shape By Kind

### Glossary page shape

Expect:

* short definition-first structure
* prerequisite framing
* links outward to deeper concept, module, model, and paper pages

### Concept page shape

Expect:

* broad idea framing
* mental-model explanation
* links to concrete module and model examples

### Module page shape

Expect:

* module metadata and tags
* role in the stack
* how-it-works explanation
* optimization targets, tradeoffs, and nearby variants
* example model usage
* graph or comparison where useful

### Model page shape

Expect:

* model family or release framing
* architecture summary
* module list and relationships
* training regime, datasets, papers, and organization links

### Paper page shape

Expect:

* what the paper introduced or argued
* linked models, modules, concepts, and training regimes
* citations and source links

### Training-regime page shape

Expect:

* objective of the regime
* when it is used
* related models, modules, and papers

### System page shape

Expect:

* system boundary and purpose
* major components and flows
* relationship to models, modules, inference, and hardware concerns

## Controlled Groupings

Every page should declare one or more groupings from this controlled set:

* `page kind`
* `subject bundle`
* `modality`
* `model family`
* `architecture family`
* `module family`
* `module type`
* `concept type`
* `training category`
* `inference category`
* `systems category`
* `paper topic`
* `difficulty`

### Starter grouping values

* `subject bundle`: `chatgpt`, `stable-diffusion`, `transformer-core`,
  `inference-serving`, `training-alignment`, `multimodal-omni`,
  `world-models`, `hardware-distributed`
* `modality`: `text`, `image`, `audio`, `video`, `multimodal`
* `model family`: `gpt`, `llama`, `mistral`, `gemma`, `bert`, `t5`, `whisper`,
  `clip`, `stable-diffusion`, `flux`, `world-model`
* `architecture family`: `transformer`, `diffusion`, `state-space-model`,
  `recurrent`, `convolutional`, `graph-neural-network`, `multimodal`,
  `world-model`
* `module family`: `attention`, `normalization`, `feed-forward`, `activation`,
  `position-encoding`, `tokenization`, `quantization`, `inference-optimization`
* `module type`: `attention`, `normalization`, `feed-forward`, `activation`,
  `position-encoding`, `tokenizer`, `optimizer`, `quantization`,
  `inference-optimization`, `training-method`, `systems`, `other`
* `concept type`: `architecture`, `math`, `training`, `inference`, `systems`,
  `evaluation`, `general`
* `training category`: `pretraining`, `post-training`, `alignment`, `rl`,
  `distillation`, `optimization`
* `inference category`: `kv-cache`, `speculative-decoding`, `quantized-inference`,
  `long-context`, `serving`, `latency`, `throughput`
* `systems category`: `serving-stack`, `runtime`, `scheduler`, `memory`,
  `routing`, `distributed-training`, `deployment`
* `paper topic`: `architecture`, `training`, `inference`, `evaluation`,
  `dataset`, `systems`, `scaling`, `alignment`
* `difficulty`: `intro`, `intermediate`, `advanced`

## Controlled Tag Set

Tags should be chosen from a controlled vocabulary up front rather than
invented page by page.

Use the data-model tag categories:

* `architecture`
* `module-type`
* `training`
* `inference`
* `systems`
* `modality`
* `paper-topic`
* `model-family`
* `difficulty`

### Starter canonical tags

* `architecture`: `transformer`, `diffusion`, `state-space-model`,
  `encoder-only`, `decoder-only`, `encoder-decoder`, `multimodal`,
  `world-model`
* `module-type`: `attention`, `normalization`, `feed-forward`, `activation`,
  `position-encoding`, `tokenization`, `mixture-of-experts`, `quantization`
* `training`: `pretraining`, `post-training`, `alignment`, `distillation`,
  `rlhf`, `dpo`
* `inference`: `kv-cache`, `long-context`, `speculative-decoding`, `serving`,
  `latency`, `throughput`
* `systems`: `inference-engine`, `scheduler`, `memory`, `routing`,
  `deployment`, `distributed-training`
* `modality`: `text`, `image`, `audio`, `video`, `multimodal`
* `paper-topic`: `architecture`, `training`, `inference`, `evaluation`,
  `dataset`, `scaling`, `alignment`
* `model-family`: `gpt`, `llama`, `mistral`, `gemma`, `bert`, `t5`, `whisper`,
  `clip`, `stable-diffusion`, `flux`
* `difficulty`: `intro`, `intermediate`, `advanced`

### Tagging rules

* tags do not replace typed fields such as `moduleType`, `moduleFamily`,
  `conceptType`, or `family`
* every page should have tags that match its page kind and grouping
* module pages should usually carry both a `module-type` tag and a broader
  family tag such as `attention` or `normalization`
* glossary pages should stay light on tags

## Page Candidate Shape

When promoting a topic into work, shape it like:

```txt
subject:
kind: module | model | concept | paper | training-regime | system | glossary | blog
slug:
route:
registryKind:
template:
groupings:
tags:
aliases:
registryFields:
whyThisKind:
whyThisSubject:
relatedBy:
starterBatch:
notes:
```

## Bundle Structure

Each subject bundle should try to include a complete end-to-end reader path:

* one landing or anchor concept
* glossary prerequisites
* concrete modules
* representative models
* representative papers
* training-regime pages where relevant
* systems pages where relevant

## Subject Bundles

### ChatGPT And Modern Chat Assistants

Reader goal: understand what a ChatGPT-like product is built from, what model
families it depends on, how chat generation works, and what alignment and
serving concepts matter.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| chatgpt | subject bundle | gpt |
| transformer | architecture family | transformer |
| decoder-only architecture | architecture | decoder-only |

#### Glossary pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| token | glossary | intro |
| embedding | glossary | intro |
| logit | glossary | intro |
| softmax | glossary | intro |

#### Concept pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| attention | concept | attention |
| self-attention | concept | attention |
| normalization | concept | normalization |

#### Module pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| causal attention | module type | attention |
| multi-head attention | module family | attention |
| grouped-query attention | module family | attention |
| sliding-window attention | module family | attention |
| feed-forward network | module family | feed-forward |
| standard FFN | module type | feed-forward |
| SwiGLU | module type | activation |
| RMSNorm | module family | normalization |
| RoPE | module family | position-encoding |
| tokenizer mismatch | module family | tokenization |

#### Model pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| ChatGPT | model family | gpt |
| GPT-4 class models | model family | gpt |

#### Training-regime pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| instruction tuning | training category | post-training |
| RLHF | training category | alignment |
| DPO | training category | alignment |

#### Inference pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| KV cache | inference category | kv-cache |
| prefill/decode split | inference category | serving |
| sampling overview | inference category | serving |
| speculative decoding | inference category | speculative-decoding |

#### System pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| inference serving stack | systems category | inference-engine |

### Stable Diffusion And Image Generation

Reader goal: understand diffusion-based image generation from latent space and
denoising through model families, conditioning, and serving.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| stable diffusion | subject bundle | stable-diffusion |
| diffusion model | architecture family | diffusion |

#### Glossary pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| latent | glossary | intro |
| patch | glossary | intro |

#### Concept pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| denoising generation | concept type | architecture |
| latent space | concept | intro |
| conditioning | concept type | architecture |
| self-attention | concept | attention |
| U-Net style denoiser | concept type | architecture |
| guidance | concept type | inference |

#### Module pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| cross-attention | module family | attention |

#### Model pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| CLIP | model family | clip |
| Stable Diffusion | model family | stable-diffusion |
| Flux | model family | flux |

#### Training-regime pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| diffusion training objective | training category | pretraining |

#### Inference pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| sampler | inference category | serving |

#### Paper pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| latent diffusion paper | paper topic | architecture |

#### System pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| scheduler | systems category | scheduler |
| image generation serving | systems category | deployment |

### Transformer Core And Attention Variants

Reader goal: compare transformer building blocks and navigate the major
attention, normalization, feed-forward, positional, and tokenizer choices.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| transformer-core | subject bundle | transformer |
| transformer | architecture family | transformer |
| encoder-only architecture | architecture | encoder-only |
| decoder-only architecture | architecture | decoder-only |
| encoder-decoder architecture | architecture | encoder-decoder |

#### Concept pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| attention | concept | attention |
| self-attention | concept | attention |
| cross-attention | concept | attention |
| normalization | concept | normalization |
| feed-forward network | concept | feed-forward |
| activation | concept | activation |
| positional encodings | concept | position-encoding |
| tokenizer overview | concept | tokenization |

#### Module pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| multi-head attention | module family | attention |
| multi-query attention | module family | attention |
| grouped-query attention | module family | attention |
| multi-head latent attention | module family | attention |
| sparse attention | module family | attention |
| sliding-window attention | module family | attention |
| linear attention | module family | attention |
| layer norm | module family | normalization |
| RMSNorm | module family | normalization |
| QK norm | module family | normalization |
| standard FFN | module family | feed-forward |
| mixture of experts | module family | mixture-of-experts |
| ReLU | module type | activation |
| SiLU | module type | activation |
| SwiGLU | module type | activation |
| RoPE | module family | position-encoding |
| ALiBi | module family | position-encoding |
| BPE | module family | tokenization |
| SentencePiece | module family | tokenization |

### Inference, Serving, And Runtime Behavior

Reader goal: understand how model outputs are actually served, optimized, and
measured in production.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| inference-serving | subject bundle | serving |

#### Glossary pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| prefill | glossary | serving |
| decode | glossary | serving |

#### Inference pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| KV cache | inference category | kv-cache |
| prefill/decode split | inference category | serving |
| speculative decoding | inference category | speculative-decoding |
| quantized inference | inference category | quantized-inference |
| latency | inference category | latency |
| throughput | inference category | throughput |
| time to first token | inference category | latency |
| inter-token latency | inference category | latency |
| tokens per second | inference category | throughput |
| throughput vs latency | inference category | throughput |

#### System pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| batching | systems category | scheduler |
| inference engine | systems category | inference-engine |
| routing | systems category | routing |
| deployment | systems category | deployment |
| memory | systems category | memory |

### Training, Alignment, And Optimization

Reader goal: understand how modern models are trained, tuned, aligned, and kept
stable.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| training-alignment | subject bundle | pretraining |

#### Glossary pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| optimizer state | glossary | optimization |
| backpropagation | glossary | optimization |
| gradient | glossary | optimization |
| loss function | glossary | optimization |
| overfitting | glossary | evaluation |
| generalization | glossary | evaluation |

#### Concept pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| alignment | concept type | alignment |
| scaling law | concept | scaling |
| regularization | concept type | training |

#### Training-regime pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| pretraining | training category | pretraining |
| post-training | training category | post-training |
| distillation | training category | distillation |
| RLHF | training category | alignment |
| PPO | training category | alignment |
| DPO | training category | alignment |
| GRPO | training category | alignment |

### Multimodal, Omni, World, Audio, And Video

Reader goal: understand how the same reference system extends beyond text-only
language models.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| multimodal-omni | subject bundle | multimodal |
| world-models | subject bundle | world-model |
| multimodal model | architecture family | multimodal |
| world model | architecture family | world-model |

#### Module pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| multimodal tokenization | module family | tokenization |
| cross-modal attention | module family | attention |

#### Model pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| Whisper | model family | whisper |
| CLIP | model family | clip |

#### Modality pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| video generation | modality | video |
| audio model | modality | audio |
| image model | modality | image |

#### Concept pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| encoder-decoder fusion | architecture | multimodal |

### Hardware, Distributed Systems, And Kernels

Reader goal: understand the practical systems layer under training and
inference.

#### Bundle anchors

| Subject | Grouping | Tag |
| --- | --- | --- |
| hardware-distributed | subject bundle | distributed-training |

#### System pages

| Subject | Grouping | Tag |
| --- | --- | --- |
| GPU | systems category | memory |
| memory hierarchy | systems category | memory |
| interconnect | systems category | distributed-training |
| distributed training | systems category | distributed-training |
| scheduler | systems category | scheduler |
| kernel optimization | systems category | inference-engine |
| deployment topology | systems category | deployment |

## Graph Presentation Strategy

When adding module pages, choose graph presentations by teaching goal rather
than by module label.

### Preferred graph families

* **Head-structure comparison**
  * Best for head-sharing and KV-structure variants.
  * Current examples: multi-head attention, multi-query attention,
    grouped-query attention, multi-head latent attention.

* **Attention-over-time comparison**
  * Best for variants that change which prior positions are reachable.
  * Current examples: sliding-window attention, sparse attention.

* **Compute-path comparison**
  * Best for variants that change how attention is computed internally rather
    than which positions are reachable.
  * Current example: linear attention.

* **Architecture/block placement view**
  * Best for model, architecture, and system pages, or module pages whose main
    question is where a component sits inside a stack.

### Working heuristic

If the page's central question is:

* "How many Q/K/V or KV groups exist?" use **head-structure comparison**
* "What time steps can `q_t` read from?" use **attention-over-time comparison**
* "What summary/recurrent object replaces dense attention?" use
  **compute-path comparison**
* "Where does this live in the larger model?" use **architecture/block
  placement**

## Bundle-Level Delivery Rules

A subject bundle is in good shape when:

* a beginner can enter through one anchor page and keep moving without getting
  stranded
* the subject has glossary, concept, module, and model coverage where needed
* the tags and groupings let search and tag pages reconstruct the subject cleanly
* nearby variants and related pages are derived rather than manually hand-listed
* the bundle can ship independently of unrelated bundles
