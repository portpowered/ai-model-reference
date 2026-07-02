# Graphing Standards

Reviewer-checkable rules for /charts/graphs on canonical docs pages. 

These
standards define the preferred graph representations for module pages, with a
strong emphasis on choosing the graph that teaches the module's actual change
rather than reusing one generic diagram shape everywhere.

### Decision rule

The appropriate graph is different. When considering a graph you MUST choose the best presentation(s).

Ask: "What is the smallest visual contrast that makes the module different from
the baseline?"

We define the overall set of graphs as follows: 

1. line charts. these are used when the thing being described is a function like sigmoid, or tanh. Similarly its useful for presenting things KL divergence. 
2. module graphs. These are best used to explain interaction between components such as for explaining models, and explaining interactions (i.e. QKV interaction, or attention)
3. heatmaps. These are basically a presentation of a math matrix and weight numbers. These are best used by functions that present change in tensor variation such as showing what happens to the activations that propagate through RELU.  You basically color code for example the activation weights. 
4. bar charts. When we are evaluating performance between nodes/components and want a clear comparison value.
5. scatter charts. use these when we are presenting points over a distribution or like comparing things across X/Y axis. some examples are like model performance vs cost, and t-sne style distributions for embeddings.
6. control charts. use these for showing drift modelling over time, and others wherein distribution over time and analyzing overall trends is useful. 
7. timeline charts. these are useful for seeing operations over time. i.e. we see instruction operations for DDP/FSDP, or like instruction pipelining on the kernel. 

Use the appropriate libraries and don't try to build these yourself if possible. 
Or whatever else may be appropriate. 

We disvow these and you MUST NOT  use these. 
1. circle charts.
2. radar charts. 

### additional graph selection notes

* If the answer is **head count or KV sharing**, use head-structure comparison.
* If the answer is **reachable time steps or mask pattern**, use
  attention-over-time comparison.
* If the answer is **new recurrence, kernel, or summary update**, use
  compute-path comparison.
* If the answer is **where the component sits in the stack**, use a
  block-or-architecture view.

Avoid diagrams that are technically valid but visually teach the wrong thing.
That failure mode matters more than whether a graph looks "consistent" with
other pages.

Directional reference: [Sebastian Raschka — Grouped-Query Attention](https://sebastianraschka.com/faq/docs/grouped-query-attention.html).


## Non-module graphs

Paper and model pages include graphs **only where they teach architecture or contributions**. Do not add React Flow canvases for decoration or duplicate table content.

## Reviewer checklist

Before approving a change:
Generally all graphs/charts MUST be: 
1. The graph properly expresses and is the most suitable possible presentation amongst possible presentations.
2. The graph properly expresses math formulas by apply katex based formatting
3. The graph properly presents arrows in flow direction. 
4. The graph is renderable and is visible
5. The graph MUST fits with the other presentations of graphs. i.e. 
5.1. model pages for llms should look like the gpt-3 model page, 
5.2. attention should look like the various variants that we have like for sparse attention. 
5.3. the only caveat is that if there is no existing comparable, then we shoudl add a new one.
6. The graph MUST immediately be obvious to the customer what it is trying to present
7. the graph MUST be the most appropriate presentation 
8. The graph MUST have a legend
9. The graph MUST have a title
10. The graph MUST choose WCAG accessible colors. 

### Charts specific
9. The chart MUST label its axes
10. The chart must be 0 indexed, and start from 0. 

### node graph specific rules

For node graphs we don't necessarily want to use the most closest model's graph representation. 

8. the nodes MUST be legible, we should not have weird graph presentations where the text covered nodes are overlain with edge nodes. 
9. Edge flows MUST be visible. we should try to angle the nodes such that edges are either directly straight visible, or we should make them angle around. 
10. Node graphs MUST emphasize with colors that are the most important. Use primary/secondary colors like the rest of the website to emphasize high value components on a node graph. 
10.1. I.e. for variation comparisons, you MUST color emphasize the part that is different from the original. 
### Comparison charts

These are rules for charts which are done as a comparison. 

1. if a graph is comparing itself with an existing concept it MUST be the best presenting graph for the comparison. i.e. when you introduce a new variant of DeepSeekMOE then it should compare against MOE. 
2. The graphs should emphasize the differences. I.e. if the routing is different, then we should emphasize those attributes or we're evaluating top X experts versus topMK and we're always picking Y experts then we should explain so. 