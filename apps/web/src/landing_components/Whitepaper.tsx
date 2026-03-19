import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { FileText, ArrowRight, Database, Cpu, Layers, ShieldCheck, Zap } from 'lucide-react';

// Custom math components using katex directly (replaces react-katex)
const InlineMath = ({ math }: { math: string }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const BlockMath = ({ math }: { math: string }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const Whitepaper: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'foundations' | 'risk' | 'settlement' | 'market-comparison'>('foundations');

  return (
    <div className="py-24 bg-slate-50 border-t border-slate-200 relative overflow-hidden" id="whitepaper">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-display font-bold leading-tight text-slate-900 mb-4"
          >
            RetroPick <span className="text-gradient-animated">Architecture</span>
          </motion.h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-8">
            AI-orchestrated prediction infrastructure with adaptive LS-LMSR liquidity, unified vaults, and verifiable off-chain execution. Powered by Chainlink CRE, CCIP, and Yellow State Sessions.
          </p>

          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-blue-600 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
            <motion.a
              href="/whitepaper.pdf"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-bold shadow-2xl shadow-blue-600/50 hover:bg-blue-500 transition-all border border-blue-400/20"
            >
              <FileText className="w-5 h-5" />
              <span className="tracking-wide">READ WHITEPAPER</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.a>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-3 flex lg:flex-col overflow-x-auto gap-3 pb-2 lg:pb-0 scrollbar-hide snap-x">
            {[
              { id: 'foundations', label: 'LS-LMSR Foundations', icon: <Database className="w-4 h-4 shrink-0" /> },
              { id: 'risk', label: 'Risk & Liquidity', icon: <ShieldCheck className="w-4 h-4 shrink-0" /> },
              { id: 'settlement', label: 'Yellow Sessions', icon: <Cpu className="w-4 h-4 shrink-0" /> },
              { id: 'market-comparison', label: 'vs Order Books', icon: <Layers className="w-4 h-4 shrink-0" /> },
            ].map((tab, index) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-none lg:w-full flex items-center gap-2 md:gap-3 px-4 py-3 md:px-5 md:py-4 rounded-xl text-[13px] md:text-sm font-bold transition-all border snap-start ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-500 scale-[1.02] lg:scale-105'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-9">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100/50 to-purple-100/50 blur-xl rounded-[2rem] -z-10"></div>

              <AnimatePresence mode="wait">
                {activeTab === 'foundations' && (
                  <motion.div
                    key="foundations"
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/50 shadow-xl space-y-6"
                  >
                    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">LS-LMSR Foundations</h3>
                    <div className="prose prose-slate max-w-none text-slate-600">
                      <p>
                        RetroPick uses the <strong>Logarithmic Market Scoring Rule (LMSR)</strong> baseline with liquidity-sensitive extension.
                        A cost-function market maker maintains a convex function C(q) mapping outstanding shares to aggregate market value; prices are the gradient.
                      </p>
                      <p>
                        Properties: continuous prices that sum to 1, bounded worst-case loss <InlineMath math="L_{\max} = b \cdot \ln(n)" />, and always-available liquidity.
                        The LS policy extends with <InlineMath math="b(q) = b_0 + \alpha \cdot OI(q)" />, enabling shallow liquidity in early markets and deeper liquidity as participation grows.
                      </p>
                      <div className="my-8 p-6 bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden group text-slate-100">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
                        <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Cost Function & Prices</h4>
                        <div className="[&_.katex-display]:text-lg [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
                          <BlockMath math="C(q) = b \cdot \ln\left(\sum_{i=1}^n e^{q_i/b}\right) \quad \Rightarrow \quad p_i(q) = \frac{e^{q_i/b}}{\sum_{j=1}^n e^{q_j/b}}" />
                        </div>
                        <p className="text-slate-400 text-sm mt-4">
                          Where <InlineMath math="b" /> is the liquidity parameter; trade cost is <InlineMath math="\Delta C = C(q + \Delta e_k) - C(q)" />.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'risk' && (
                  <motion.div
                    key="risk"
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/50 shadow-xl space-y-6"
                  >
                    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Risk Calibration & Liquidity</h3>
                    <div className="prose prose-slate max-w-none text-slate-600">
                      <p>
                        The worst-case loss bound is <InlineMath math="L_{\max} \leq b \cdot \log(n)" />. Given a per-market loss budget <InlineMath math="L" /> and <InlineMath math="n" /> outcomes, we select:
                      </p>
                      <div className="grid md:grid-cols-2 gap-6 my-6">
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                          <h4 className="font-bold text-orange-900 mb-3">Liquidity Parameter</h4>
                          <div className="text-orange-800 text-center [&_.katex]:text-xl">
                            <BlockMath math="b = \frac{L}{\log(n)}" />
                          </div>
                          <p className="text-sm text-orange-700 mt-2">Calibrated from loss budget and outcome count.</p>
                        </div>
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                          <h4 className="font-bold text-indigo-900 mb-3">Break-Even Turnover</h4>
                          <div className="text-indigo-800 text-center [&_.katex]:text-xl">
                            <BlockMath math="V^* \approx \frac{L}{\tau}" />
                          </div>
                          <p className="text-sm text-indigo-700 mt-2">Fee income <InlineMath math="\tau \cdot V" /> covers loss budget when volume <InlineMath math="V \gg L/\tau" />.</p>
                        </div>
                      </div>
                      <p>
                        Larger <InlineMath math="b" /> implies deeper liquidity. Coverage ratio <InlineMath math="\kappa = \frac{\text{VaultAssets}}{\sum_m L_m}" /> must stay above threshold for solvency.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'settlement' && (
                  <motion.div
                    key="settlement"
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/50 shadow-xl space-y-6"
                  >
                    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Yellow Sessions & Resolution</h3>
                    <div className="space-y-6">
                      <p className="text-slate-600">
                        Trading executes <strong>off-chain</strong> in hub-and-spoke Yellow sessions. Signed state S = (q, balances, positions, fees, nonce) with deterministic pricing. On-chain contracts retain custody, enforce state commitments, and handle dispute exits—<strong>latest signed state wins</strong> in challenge windows.
                      </p>
                      <ArchitectureDiagram />
                      <div className="grid grid-cols-3 gap-4 text-center mt-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-2xl font-bold text-blue-600 mb-1">Execute</div>
                          <div className="text-xs text-slate-500 uppercase font-bold">Off-chain Yellow Session</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-2xl font-bold text-blue-600 mb-1">Checkpoint</div>
                          <div className="text-xs text-slate-500 uppercase font-bold">Netted Deltas to Chain</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-2xl font-bold text-blue-600 mb-1">Resolve</div>
                          <div className="text-xs text-slate-500 uppercase font-bold">MODRA CRE Workflow</div>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm">
                        Resolution: MODRA fetches evidence via Confidential HTTP, posts bonded outcome proposals, escalates disputes to Senate-style adjudication. Risk Sentinel monitors solvency, concentration, volatility.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'market-comparison' && (
                  <motion.div
                    key="market-comparison"
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/50 shadow-xl space-y-6"
                  >
                    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">LS-LMSR vs Order Books</h3>
                    <div className="prose prose-slate max-w-none text-slate-600 mb-6">
                      <p>Order-book venues match buyers and sellers; liquidity is endogenous and can dry up in thin markets. CFMMs like LS-LMSR guarantee always-on liquidity with provably bounded risk.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                      <div className="border border-slate-200 bg-slate-50 rounded-2xl p-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <h4 className="font-bold text-slate-500 mb-4 text-lg">Order Books (CLOBs)</h4>
                        <ul className="space-y-3 text-sm text-slate-500">
                          <li className="flex items-center gap-2">❌ Liquidity fragments in long-tail markets</li>
                          <li className="flex items-center gap-2">❌ Requires active market makers</li>
                          <li className="flex items-center gap-2">❌ Spreads widen when participation is low</li>
                        </ul>
                      </div>
                      <div className="border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-lg transform scale-105">
                        <h4 className="font-bold text-blue-700 mb-4 text-lg flex items-center gap-2">
                          <Zap className="w-5 h-5 fill-blue-500" />
                          RetroPick: LS-LMSR
                        </h4>
                        <ul className="space-y-3 text-sm text-blue-800">
                          <li className="flex items-center gap-2">✅ Always-available liquidity</li>
                          <li className="flex items-center gap-2">✅ Bounded worst-case loss (b·log n)</li>
                          <li className="flex items-center gap-2">✅ Coherent probabilities (prices sum to 1)</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NODES = [
  { id: 'cre', label: 'CRE Receiver', sublabel: 'Oracle Ingress', color: 'from-violet-600 to-purple-700', borderColor: 'border-violet-500/50' },
  { id: 'oc', label: 'Oracle Coordinator', sublabel: 'Validate & Route', color: 'from-blue-600 to-indigo-600', borderColor: 'border-blue-500/50' },
  { id: 'sr', label: 'Settlement Router', sublabel: 'Hub', color: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-400/50' },
  { id: 'cs', label: 'Channel Settlement', sublabel: 'Checkpoint', color: 'from-emerald-600 to-teal-600', borderColor: 'border-emerald-500/50' },
  { id: 'el', label: 'Execution Ledger', sublabel: 'Positions & Deltas', color: 'from-green-500 to-emerald-600', borderColor: 'border-green-400/50' },
] as const;

const ArchitectureDiagram = () => {
  return (
    <div className="w-full bg-slate-900/95 rounded-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.12),transparent_60%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="relative z-10 flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-3 md:gap-4 min-h-[140px] overflow-x-auto pb-6 pt-2 px-1 snap-x scrollbar-hide">
        {NODES.map((node, i) => (
          <React.Fragment key={node.id}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center"
            >
              <motion.div
                whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
                className={`relative px-4 py-3 md:px-5 md:py-3.5 rounded-xl bg-gradient-to-br ${node.color} border ${node.borderColor} shadow-lg backdrop-blur-sm ring-2 ring-white/5`}
              >
                <motion.div
                  className="absolute inset-0 rounded-xl bg-white/10"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                />
                <div className="relative">
                  <div className="text-sm md:text-base font-bold text-white tracking-tight">{node.label}</div>
                  <div className="text-[10px] md:text-xs text-white/70 mt-0.5">{node.sublabel}</div>
                </div>
              </motion.div>
            </motion.div>

            {i < NODES.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.12 }}
                className="flex items-center shrink-0 min-w-[1.5rem] sm:min-w-[2.5rem]"
              >
                <div className="relative w-6 sm:w-10 md:w-12 h-6 flex items-center">
                  <div className="absolute inset-y-0 left-0 right-4 flex items-center">
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-600 via-cyan-500/70 to-slate-600 rounded-full" />
                  </div>
                  <motion.div
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                    animate={{ x: [0, 20] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                  />
                  <svg viewBox="0 0 24 24" className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400">
                    <polyline points="9,18 15,12 9,6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-center"
      >
        <span className="text-xs text-slate-500">
          <span className="text-cyan-400/80 font-medium">Settlement Router</span> routes 0x01 result → MarketRegistry (resolve) · session payload → Channel Settlement
        </span>
      </motion.div>
    </div>
  );
};

export default Whitepaper;