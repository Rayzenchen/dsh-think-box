window.__ModuleLoader__.load({
	id: "@local/dsh-think-box",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let _deepseek_ai_dsh_client_ui_attachment = require("@deepseek-ai/dsh-client-ui-attachment");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/applyOwnership.ts
		/**
		* Single-live-instance gate for this plugin's browser half.
		*
		* `apply` runs once per *module instance*, and a client reload (HMR reconnect,
		* a `connection lost` recovery, a second bundle URL for the same id) can leave
		* the previous instance's registrations alive: its module state is unreachable
		* from the new instance, but the slot registry it wrote to is shared. Two live
		* instances mean two conversation followers driving the same scroller - a state
		* this package's own row takeover documents as "two scroll owners", where each
		* instance restores styles it captured from the other's mid-flight values.
		*
		* Module-scoped state cannot detect that, so the handoff goes through one
		* global slot: a new instance asks the previous one to stand down, and only
		* then installs its own.
		*/
		/** Global slot holding the current instance's stand-down callback. */
		const APPLY_OWNER_GLOBAL = "__DSH_THINK_BOX_APPLY__";
		function bag() {
			return globalThis;
		}
		/**
		* Take ownership of the browser half, standing the previous instance down.
		*
		* Must be called at the top of `apply`, before anything is registered: the
		* instance being replaced has to release the slot registry first, otherwise
		* both ends up wrapping the same rows.
		*
		* @param run Teardown of the claiming instance. Read lazily, so the slot can be
		* claimed before the registrations exist; swapping in the real teardown later
		* is what a stand-down of this instance will run.
		* @returns Idempotent release. Clears the slot only while this instance still
		* owns it, so an older instance winding down can never unregister a newer one.
		*/
		function claimApplyOwnership(run) {
			const slot = bag();
			const previous = slot[APPLY_OWNER_GLOBAL];
			if (typeof previous === "function") {
				slot[APPLY_OWNER_GLOBAL] = void 0;
				try {
					previous();
				} catch (error) {
					console.error("[dsh-think-box] previous client instance failed to stand down", error);
				}
			}
			slot[APPLY_OWNER_GLOBAL] = run;
			return () => {
				if (slot["__DSH_THINK_BOX_APPLY__"] === run) slot[APPLY_OWNER_GLOBAL] = void 0;
			};
		}
		//#endregion
		//#region src/client/harnessIcons.ts
		const icons = _deepseek_ai_dsh_client_ui_primitives;
		function lookup(name) {
			try {
				return icons[name];
			} catch {
				return;
			}
		}
		function resolveIcon(currentName, legacyName) {
			const icon = lookup(currentName) ?? lookup(legacyName);
			if (icon === void 0) throw new Error(`dsh-think-box: Harness icon export is missing (${currentName}, ${legacyName})`);
			return icon;
		}
		const IconChevronDown = resolveIcon("IconChevronDownOutlineRegular", "IconChevronDownOutline14");
		const IconChevronRight = resolveIcon("IconChevronRightOutlineRegular", "IconChevronRightOutline14");
		const IconCheck = resolveIcon("IconCheckOutlineRegular", "IconCheckOutline14");
		const IconThink = resolveIcon("IconThinkOutlineRegular", "IconThinkOutline14");
		//#endregion
		//#region \0dsh-css:/Users/wench/Documents/DS Harness/dsh-think-box-plugin/src/client/ReasoningAssistantNodeView.module.css.mjs
		const css$3 = ".kbKt2W_root{min-width:0;color:var(--dsw-alias-label-primary);font-size:var(--dsh-content-font-size,16px);line-height:calc(24px + var(--dsh-content-font-delta,4px));flex-direction:column;display:flex}.kbKt2W_body{flex-direction:column;gap:16px;min-width:0;display:flex}.kbKt2W_body>[data-turn-process-inline][hidden]{margin-bottom:-16px}.kbKt2W_think{flex-direction:column;display:flex}.kbKt2W_thinkRow{position:relative;overflow:hidden}.kbKt2W_think[data-state=running] .kbKt2W_thinkRow:after{content:\"\";inset-block:0;background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite kbKt2W_dsh-think-box-think-sweep;position:absolute;left:0}@keyframes kbKt2W_dsh-think-box-think-sweep{0%{left:-300px}90%,to{left:100%}}.kbKt2W_thinkLeading{flex-shrink:0}.kbKt2W_thinkChevron{color:var(--dsw-alias-label-secondary)}.kbKt2W_thinkTitle{font-weight:400}.kbKt2W_thinkSeparator{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.kbKt2W_thinkInline{--dsh-thinking-inline-span:2;--dsh-thinking-inline-pad-y:4px;--dsh-thinking-inline-extra:8px;box-sizing:border-box;min-width:0;padding:var(--dsh-thinking-inline-pad-y) 8px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-content-font-size-secondary,14px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,4px));white-space:pre-wrap;word-break:break-word;max-height:calc(var(--dsh-thinking-inline-span) * (20px + var(--dsh-content-font-delta-secondary,4px)) + 2 * var(--dsh-thinking-inline-pad-y) + 2px + var(--dsh-thinking-inline-extra));scrollbar-width:none;scrollbar-color:var(--dsw-alias-border-l4,#80808066) transparent;background:var(--dsw-alias-bg-skeleton,#0000000a);border:1px solid var(--dsw-alias-border-l2,#0000001a);border-radius:var(--dsh-thinking-radius,var(--dsw-radius-sm,8px));contain:layout;transition:max-height .32s var(--ds-ease-in-out,cubic-bezier(.4, 0, .2, 1));flex:auto;overflow-y:auto;transform:translateZ(0)}.kbKt2W_thinkBody::-webkit-scrollbar{width:0;height:0}.kbKt2W_thinkBody:hover{scrollbar-width:thin}.kbKt2W_thinkBody:hover::-webkit-scrollbar{width:6px}.kbKt2W_thinkInline::-webkit-scrollbar{width:0;height:0}.kbKt2W_thinkInline:hover{scrollbar-width:thin}.kbKt2W_thinkInline:hover::-webkit-scrollbar{width:6px}.kbKt2W_thinkInline[data-settled]{--dsh-thinking-inline-span:1;--dsh-thinking-inline-pad-y:2px;--dsh-thinking-inline-extra:0px}.kbKt2W_disclosureRow.kbKt2W_thinkRowInline{height:auto;min-height:calc(24px + var(--dsh-content-font-delta,0px));padding-block:2px}.kbKt2W_thinkBody{box-sizing:border-box;padding:4px 8px 4px calc(22px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-content-font-size-secondary,14px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,4px));white-space:pre-wrap;word-break:break-word;max-height:var(--dsh-thinking-max-height,calc(var(--dsh-thinking-expanded-lines,18) * (20px + var(--dsh-content-font-delta-secondary,4px)) + 10px));scrollbar-width:none;scrollbar-color:var(--dsw-alias-border-l4,#80808066) transparent;background:var(--dsw-alias-bg-skeleton,#0000000a);border:1px solid var(--dsw-alias-border-l2,#0000001a);border-radius:var(--dsh-thinking-radius,var(--dsw-radius-sm,8px));contain:layout;will-change:scroll-position;overflow-y:auto;transform:translateZ(0)}.kbKt2W_thinkBody::-webkit-scrollbar{width:6px}.kbKt2W_thinkBody::-webkit-scrollbar-track{background:0 0}.kbKt2W_thinkBody::-webkit-scrollbar-thumb{background-color:var(--dsw-alias-border-l4,#80808066);border-radius:3px}.kbKt2W_thinkBody::-webkit-scrollbar-thumb:hover{background-color:var(--dsw-alias-border-l3,#80808099)}.kbKt2W_disclosureRoot{flex-direction:column;width:100%;min-width:0;display:flex}.kbKt2W_disclosureRow{height:calc(24px + var(--dsh-content-font-delta,0px));cursor:pointer;align-items:center;min-width:0;display:flex;position:relative;overflow:hidden}.kbKt2W_disclosureLeading{width:calc(16px + var(--dsh-content-font-delta,0px));height:calc(16px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;margin-right:6px;display:inline-flex;position:relative}.kbKt2W_disclosureLeading svg:not([data-state]){width:calc(14px + var(--dsh-content-font-delta,0px));height:calc(14px + var(--dsh-content-font-delta,0px))}.kbKt2W_disclosureIconIdle{opacity:1;transition:opacity .1s;display:inline-flex}.kbKt2W_disclosureChevronHover{opacity:0;margin:auto;transition:opacity .1s;position:absolute;inset:0}.kbKt2W_disclosureRow:hover .kbKt2W_disclosureIconIdle{opacity:0}.kbKt2W_disclosureRow:hover .kbKt2W_disclosureChevronHover{opacity:1}.kbKt2W_disclosureTitle{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-secondary);flex:none}.kbKt2W_disclosureContent{visibility:visible;transition:grid-template-rows var(--ds-transition-duration,.2s) var(--ds-ease-in-out,cubic-bezier(.4, 0, .2, 1)), visibility 0s;grid-template-rows:1fr;display:grid;overflow:hidden}.kbKt2W_disclosureContent[data-collapsed]{visibility:hidden;transition:grid-template-rows var(--ds-transition-duration,.2s) var(--ds-ease-in-out,cubic-bezier(.4, 0, .2, 1)), visibility 0s var(--ds-transition-duration,.2s);grid-template-rows:0fr}.kbKt2W_disclosureContent[data-collapsed]>*{padding-top:0!important;padding-bottom:0!important}.kbKt2W_disclosureContent[data-no-transition]{transition:none}.kbKt2W_disclosureContent>*{min-height:0}.kbKt2W_disclosureContent[data-collapsed]>*{overflow:hidden}@media (prefers-reduced-motion:reduce){.kbKt2W_think[data-state=running] .kbKt2W_thinkRow:after{animation:none}.kbKt2W_disclosureContent,.kbKt2W_disclosureContent[data-collapsed]{transition:none}}.kbKt2W_stopped{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);border-radius:6px;align-self:flex-start;padding:0 6px;font-size:11px;line-height:18px}.kbKt2W_visuallyHidden{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.kbKt2W_follow{contain:layout style;min-width:0}.kbKt2W_root :not(pre)>code{line-height:inherit;white-space:normal;overflow-wrap:anywhere;vertical-align:baseline;display:inline}@supports (text-box-trim:trim-both){.kbKt2W_root :is(p,h1,h2,h3,h4,h5,h6,blockquote):not(:has(img)){text-box-trim:trim-both;text-box-edge:text}}.kbKt2W_disclosureTrailing{flex:none;align-items:center;gap:8px;margin-left:auto;display:inline-flex}.kbKt2W_thinkTranslateStatus{color:var(--dsw-alias-label-caption);font-size:calc(11px + var(--dsh-content-font-delta,0px));line-height:calc(18px + var(--dsh-content-font-delta,0px));white-space:nowrap}.kbKt2W_thinkTranslateButton{color:var(--dsw-alias-label-tertiary);font:inherit;font-size:calc(11px + var(--dsh-content-font-delta,0px));line-height:calc(18px + var(--dsh-content-font-delta,0px));white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;padding:0 2px}.kbKt2W_thinkTranslateButton:hover{color:var(--dsw-alias-label-primary)}.kbKt2W_thinkTranslateButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}.kbKt2W_thinkExpanded{flex-direction:column;min-height:0;display:flex}";
		const tagId$3 = "@local/dsh-think-box/ReasoningAssistantNodeView.module.css";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@local/dsh-think-box";
				tag.dataset.pluginCss = tagId$3;
				document.head.appendChild(tag);
			}
			tag.textContent = css$3;
		}
		var ReasoningAssistantNodeView_module_css_default = {
			"follow": "kbKt2W_follow",
			"disclosureTrailing": "kbKt2W_disclosureTrailing",
			"thinkTranslateStatus": "kbKt2W_thinkTranslateStatus",
			"thinkInline": "kbKt2W_thinkInline",
			"disclosureIconIdle": "kbKt2W_disclosureIconIdle",
			"thinkExpanded": "kbKt2W_thinkExpanded",
			"thinkTranslateButton": "kbKt2W_thinkTranslateButton",
			"disclosureLeading": "kbKt2W_disclosureLeading",
			"visuallyHidden": "kbKt2W_visuallyHidden",
			"stopped": "kbKt2W_stopped",
			"dsh-think-box-think-sweep": "kbKt2W_dsh-think-box-think-sweep",
			"root": "kbKt2W_root",
			"body": "kbKt2W_body",
			"think": "kbKt2W_think",
			"thinkLeading": "kbKt2W_thinkLeading",
			"thinkSeparator": "kbKt2W_thinkSeparator",
			"thinkChevron": "kbKt2W_thinkChevron",
			"thinkBody": "kbKt2W_thinkBody",
			"disclosureRow": "kbKt2W_disclosureRow",
			"disclosureTitle": "kbKt2W_disclosureTitle",
			"thinkRowInline": "kbKt2W_thinkRowInline",
			"thinkTitle": "kbKt2W_thinkTitle",
			"disclosureContent": "kbKt2W_disclosureContent",
			"thinkRow": "kbKt2W_thinkRow",
			"disclosureChevronHover": "kbKt2W_disclosureChevronHover",
			"disclosureRoot": "kbKt2W_disclosureRoot"
		};
		//#endregion
		//#region src/client/AnimatedDisclosure.tsx
		/** Class-name join for optional overlay classes over the chrome defaults. */
		function cx(...parts) {
			return parts.filter((part) => part !== void 0 && part !== "").join(" ");
		}
		/**
		* Render one disclosure header whose expanded body is height-animated.
		* @param props - Visual content, controlled open state, and the toggle
		* callback fired by row click and Enter/Space.
		* @returns the animated disclosure row.
		*/
		function AnimatedDisclosure({ icon, title, open, onToggle, collapsedContent, children, trailing, rowClassName, leadingClassName, titleClassName, chevronClassName, bodyTransition = true }) {
			const toggleFromKeyboard = (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onToggle();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ReasoningAssistantNodeView_module_css_default.disclosureRoot,
				"data-open": open || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: cx(ReasoningAssistantNodeView_module_css_default.disclosureRow, rowClassName),
					"data-disclosure-row": true,
					"data-expandable": "",
					role: "button",
					tabIndex: 0,
					"aria-expanded": open,
					onClick: onToggle,
					onKeyDown: toggleFromKeyboard,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cx(ReasoningAssistantNodeView_module_css_default.disclosureLeading, leadingClassName),
							children: open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronDown, { className: chevronClassName }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ReasoningAssistantNodeView_module_css_default.disclosureIconIdle,
								children: icon
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronDown, { className: cx(chevronClassName, ReasoningAssistantNodeView_module_css_default.disclosureChevronHover) })] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cx(ReasoningAssistantNodeView_module_css_default.disclosureTitle, titleClassName),
							children: title
						}),
						!open && collapsedContent,
						trailing !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ReasoningAssistantNodeView_module_css_default.disclosureTrailing,
							children: trailing
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ReasoningAssistantNodeView_module_css_default.disclosureContent,
					"data-disclosure-content": true,
					"data-collapsed": open ? void 0 : "",
					"data-no-transition": bodyTransition ? void 0 : "",
					children
				})]
			});
		}
		//#endregion
		//#region src/client/useReasoningReveal.ts
		/**
		* Stream-smoothing reveal hook.
		*
		* Buffers the model's chunked text and reveals it at a cadence that tracks
		* the observed arrival rate, so a long reply never dumps whole paragraphs at
		* once and a fast stream never stutters. Port of lobe-ui's smoother: EMA
		* arrival cps + chunk size, backlog pressure, commit-interval widening with
		* tail length, and a flush-speed settle drain once the input idles. The
		* reveal decision is the pure {@link computeRevealStep} for unit tests.
		*
		* This fork keeps only the `balanced` cadence: the body reveal engine was
		* removed, so the hook now drives the reasoning box alone.
		*/
		const PRESET_CONFIG = { balanced: {
			activeInputWindowMs: 220,
			defaultCps: 80,
			emaAlpha: .35,
			flushCps: 180,
			largeAppendChars: 120,
			maxActiveCps: 360,
			maxCps: 240,
			maxFlushCps: 480,
			minCps: 24,
			settleAfterMs: 280,
			settleDrainMaxMs: 420,
			settleDrainMinMs: 120,
			targetBufferMs: 40
		} };
		const QUEUE_ACCEL_EXPONENT = 1.25;
		const QUEUE_PRESSURE_FACTOR = .85;
		const CATCHUP_SECONDS = .15;
		const clamp = (value, min, max) => {
			return Math.min(max, Math.max(min, value));
		};
		/** Float-debt queue integration from `ultimate_stream_physics_scroller.html`. */
		function computeAdaptiveQueueStep(backlog, dtMs, debt, revealScale = 1) {
			if (backlog <= 0 || dtMs <= 0) return {
				revealChars: 0,
				debt: 0,
				speedCps: 0
			};
			const speedCps = Math.min(600, 90 + Math.pow(backlog, QUEUE_ACCEL_EXPONENT) * QUEUE_PRESSURE_FACTOR);
			const effectiveScale = clamp(revealScale, .05, 2);
			const accumulated = Math.max(0, debt) + speedCps * effectiveScale * (dtMs / 1e3);
			const revealChars = Math.min(backlog, Math.floor(accumulated));
			return {
				revealChars,
				debt: revealChars >= backlog ? 0 : accumulated - revealChars,
				speedCps
			};
		}
		/** Counts user-perceived characters (code points), not UTF-16 units. */
		const countChars = (text) => {
			let count = 0;
			for (const char of text) count += 1;
			return count;
		};
		/** Pure settle-drain decision shared by the frame loop and its tests. */
		function computeSettleDrain(config, input) {
			if (input.inputActive || !input.settling) return 0;
			const overflowCps = Math.max(0, input.backlog - 300) * 1e3 / 2;
			const drainTargetMs = clamp(input.backlog * 8, config.settleDrainMinMs, config.settleDrainMaxMs);
			const settleCps = input.backlog * 1e3 / drainTargetMs;
			return clamp(Math.max(settleCps, overflowCps), config.flushCps, config.maxFlushCps);
		}
		/**
		* Fixed velocity that closes a producer-complete queue within its deadline.
		* This completion-only target may exceed the live-stream flush ceiling.
		*/
		function computeCompletionDrain(config, backlog, initialCps = 0) {
			if (backlog <= 0) return 0;
			const deadlineSeconds = clamp(backlog * 8, config.settleDrainMinMs, config.settleDrainMaxMs) / 1e3;
			const rampAreaSeconds = SETTLE_RAMP_TAU_S * (1 - Math.exp(-deadlineSeconds / SETTLE_RAMP_TAU_S));
			const deadlineCps = (backlog - Math.max(0, initialCps) * rampAreaSeconds) / Math.max(.001, deadlineSeconds - rampAreaSeconds);
			return Math.max(deadlineCps, computeSettleDrain(config, {
				backlog,
				inputActive: false,
				settling: true
			}));
		}
		/**
		* Drain rate multiplier once the input ends: leftover backlog reveals at
		* this multiple of the steady rate, so the end never drags.
		*/
		const SETTLE_DRAIN_MULTIPLIER = 1.8;
		/** Time constant for ramping the completion-drain velocity up from streaming pace. */
		const SETTLE_RAMP_TAU_S = .09;
		/** Pure per-frame reveal decision shared by the loop and its tests. */
		function computeRevealStep(config, input, dtSeconds) {
			const trackedCps = Math.max(input.emaCps, input.arrivalCpsEma);
			const baseCps = clamp(trackedCps, config.minCps, config.maxFlushCps);
			const targetLagChars = input.inputActive ? Math.max(2, Math.round(baseCps * config.targetBufferMs / 1e3)) : 0;
			let currentCps;
			if (input.steadyCps !== void 0) currentCps = input.inputActive || input.settling ? clamp(input.steadyCps * (input.inputActive ? 1 : SETTLE_DRAIN_MULTIPLIER), config.minCps, config.maxFlushCps) : 0;
			else if (input.inputActive) {
				const overflow = Math.max(0, input.backlog - 32);
				const catchup = overflow > 0 ? overflow / CATCHUP_SECONDS : 0;
				currentCps = clamp(baseCps * 1.08 + catchup, config.minCps, config.maxFlushCps);
			} else if (input.settling) currentCps = computeSettleDrain(config, input);
			else {
				const idleFlushCps = Math.max(config.flushCps, baseCps * 1.8, input.arrivalCpsEma * .8);
				currentCps = clamp(idleFlushCps, config.flushCps, config.maxFlushCps);
			}
			const minRevealChars = input.inputActive ? 1 : 2;
			return {
				revealChars: Math.max(minRevealChars, Math.round(currentCps * dtSeconds)),
				targetLagChars
			};
		}
		/**
		* Smooth a chunked content stream into a reveal-paced display string.
		*
		* @param content - The full accumulated input so far.
		* @param options - Steady-rate wiring.
		* @returns The displayed content, revealed at the balanced cadence.
		*/
		function useReasoningReveal(content, { enabled = true, inputComplete = false, steadyCps, defaultCps, speedCpsRef, revealedCharsRef, revealScaleRef, onRevealCommit } = {}) {
			const config = PRESET_CONFIG.balanced;
			const seedCps = defaultCps ?? config.defaultCps;
			const initialContent = enabled ? "" : content;
			const [displayedContent, setDisplayedContent] = (0, react.useState)(initialContent);
			const displayedContentRef = (0, react.useRef)(initialContent);
			const displayedCountRef = (0, react.useRef)(countChars(initialContent));
			const targetContentRef = (0, react.useRef)(initialContent);
			const targetCharsRef = (0, react.useRef)([...initialContent]);
			const targetCountRef = (0, react.useRef)(countChars(initialContent));
			const emaCpsRef = (0, react.useRef)(seedCps);
			const lastInputTsRef = (0, react.useRef)(0);
			const lastInputCountRef = (0, react.useRef)(countChars(initialContent));
			const chunkSizeEmaRef = (0, react.useRef)(1);
			const arrivalCpsEmaRef = (0, react.useRef)(seedCps);
			const rafRef = (0, react.useRef)(null);
			const lastFrameTsRef = (0, react.useRef)(null);
			const queueDebtRef = (0, react.useRef)(0);
			const settleCpsRef = (0, react.useRef)(null);
			const lastDrainCpsRef = (0, react.useRef)(0);
			const speedOutRef = (0, react.useRef)(speedCpsRef);
			speedOutRef.current = speedCpsRef;
			const revealedCharsOutRef = (0, react.useRef)(revealedCharsRef);
			revealedCharsOutRef.current = revealedCharsRef;
			const revealScaleOutRef = (0, react.useRef)(revealScaleRef);
			revealScaleOutRef.current = revealScaleRef;
			const onRevealCommitOutRef = (0, react.useRef)(onRevealCommit);
			onRevealCommitOutRef.current = onRevealCommit;
			const inputCompleteRef = (0, react.useRef)(inputComplete);
			inputCompleteRef.current = inputComplete;
			const stopFrameLoop = (0, react.useCallback)(() => {
				if (rafRef.current !== null) {
					cancelAnimationFrame(rafRef.current);
					rafRef.current = null;
				}
				lastFrameTsRef.current = null;
			}, []);
			const startFrameLoopRef = (0, react.useRef)(() => {});
			const syncImmediate = (0, react.useCallback)((nextContent) => {
				stopFrameLoop();
				const chars = [...nextContent];
				const now = performance.now();
				targetContentRef.current = nextContent;
				targetCharsRef.current = chars;
				targetCountRef.current = chars.length;
				displayedContentRef.current = nextContent;
				displayedCountRef.current = chars.length;
				queueDebtRef.current = 0;
				settleCpsRef.current = null;
				lastDrainCpsRef.current = 0;
				const speedOut = speedOutRef.current;
				if (speedOut !== void 0) speedOut.current = seedCps;
				setDisplayedContent(nextContent);
				emaCpsRef.current = seedCps;
				chunkSizeEmaRef.current = 1;
				arrivalCpsEmaRef.current = seedCps;
				lastInputTsRef.current = now;
				lastInputCountRef.current = chars.length;
			}, [seedCps, stopFrameLoop]);
			const startFrameLoop = (0, react.useCallback)(() => {
				if (rafRef.current !== null) return;
				const tick = (now) => {
					const targetCount = targetCountRef.current;
					const displayedCount = displayedCountRef.current;
					const backlog = targetCount - displayedCount;
					if (backlog <= 0) {
						queueDebtRef.current = 0;
						settleCpsRef.current = null;
						const speedOut = speedOutRef.current;
						if (speedOut !== void 0) speedOut.current = seedCps;
						stopFrameLoop();
						return;
					}
					if (lastFrameTsRef.current === null) {
						lastFrameTsRef.current = now;
						rafRef.current = requestAnimationFrame(tick);
						return;
					}
					const frameIntervalMs = Math.max(0, now - lastFrameTsRef.current);
					const dtSeconds = Math.max(.001, Math.min(frameIntervalMs / 1e3, .12));
					lastFrameTsRef.current = now;
					const idleMs = now - lastInputTsRef.current;
					const producerComplete = inputCompleteRef.current;
					const inputActive = !producerComplete && idleMs <= config.activeInputWindowMs;
					const settling = producerComplete || !inputActive && idleMs >= config.settleAfterMs;
					if (!producerComplete) settleCpsRef.current = null;
					let revealChars;
					let revealSpeedCps;
					let nextQueueDebt = 0;
					if (producerComplete) {
						const previousCps = lastDrainCpsRef.current > 0 ? lastDrainCpsRef.current : Math.max(config.minCps, emaCpsRef.current);
						const drainTargetCps = settleCpsRef.current ?? computeCompletionDrain(config, backlog, previousCps);
						settleCpsRef.current = drainTargetCps;
						const rampedCps = previousCps + (drainTargetCps - previousCps) * (1 - Math.exp(-dtSeconds / SETTLE_RAMP_TAU_S));
						const settleCps = Math.min(drainTargetCps, Math.max(previousCps, rampedCps));
						lastDrainCpsRef.current = Math.min(drainTargetCps, rampedCps);
						const accumulated = Math.max(0, queueDebtRef.current) + settleCps * dtSeconds;
						revealChars = Math.min(backlog, Math.floor(accumulated));
						revealSpeedCps = settleCps;
						nextQueueDebt = revealChars >= backlog ? 0 : accumulated - revealChars;
						if (revealChars >= backlog) lastDrainCpsRef.current = 0;
					} else if (steadyCps !== void 0) {
						const step = computeRevealStep(config, {
							backlog,
							chunkSizeEma: chunkSizeEmaRef.current,
							arrivalCpsEma: arrivalCpsEmaRef.current,
							emaCps: emaCpsRef.current,
							inputActive,
							settling,
							steadyCps
						}, dtSeconds);
						revealChars = Math.min(Math.round(step.revealChars), backlog);
						revealSpeedCps = frameIntervalMs > 0 ? revealChars * 1e3 / frameIntervalMs : 0;
					} else {
						const step = computeAdaptiveQueueStep(backlog, frameIntervalMs, queueDebtRef.current, revealScaleOutRef.current?.current ?? 1);
						revealChars = step.revealChars;
						revealSpeedCps = step.speedCps;
						nextQueueDebt = step.debt;
					}
					queueDebtRef.current = nextQueueDebt;
					const speedOut = speedOutRef.current;
					if (speedOut !== void 0) speedOut.current = revealSpeedCps;
					if (revealChars <= 0) {
						rafRef.current = requestAnimationFrame(tick);
						return;
					}
					const nextCount = displayedCount + revealChars;
					const segment = targetCharsRef.current.slice(displayedCount, nextCount).join("");
					if (segment) {
						const nextDisplayed = displayedContentRef.current + segment;
						displayedContentRef.current = nextDisplayed;
						displayedCountRef.current = nextCount;
						setDisplayedContent(nextDisplayed);
					} else {
						displayedContentRef.current = targetContentRef.current;
						displayedCountRef.current = targetCount;
						setDisplayedContent(targetContentRef.current);
					}
					rafRef.current = requestAnimationFrame(tick);
				};
				rafRef.current = requestAnimationFrame(tick);
			}, [
				config,
				seedCps,
				stopFrameLoop,
				steadyCps
			]);
			(0, react.useLayoutEffect)(() => {
				const revealedCharsOut = revealedCharsOutRef.current;
				if (revealedCharsOut !== void 0) revealedCharsOut.current = displayedCountRef.current;
				if (displayedContent === "") return;
				onRevealCommitOutRef.current?.();
			}, [displayedContent]);
			(0, react.useEffect)(() => {
				startFrameLoopRef.current = startFrameLoop;
			}, [startFrameLoop]);
			(0, react.useEffect)(() => {
				if (!enabled) {
					syncImmediate(content);
					return;
				}
				const prevTargetContent = targetContentRef.current;
				if (content === prevTargetContent) return;
				const now = performance.now();
				if (!content.startsWith(prevTargetContent)) {
					syncImmediate(content);
					return;
				}
				const appendedChars = [...content.slice(prevTargetContent.length)];
				const appendedCount = appendedChars.length;
				targetContentRef.current = content;
				targetCharsRef.current.push(...appendedChars);
				targetCountRef.current += appendedCount;
				settleCpsRef.current = null;
				const hadSample = lastInputTsRef.current > 0;
				const deltaChars = targetCountRef.current - lastInputCountRef.current;
				const deltaMs = Math.max(1, now - lastInputTsRef.current);
				if (hadSample && deltaChars > 0) {
					const instantCps = deltaChars * 1e3 / deltaMs;
					const normalizedInstantCps = clamp(instantCps, config.minCps, config.maxFlushCps * 3);
					const chunkEmaAlpha = .45;
					chunkSizeEmaRef.current = chunkSizeEmaRef.current * .55 + appendedCount * chunkEmaAlpha;
					arrivalCpsEmaRef.current = arrivalCpsEmaRef.current * .55 + normalizedInstantCps * chunkEmaAlpha;
					emaCpsRef.current = emaCpsRef.current * (1 - config.emaAlpha) + normalizedInstantCps * config.emaAlpha;
				}
				lastInputTsRef.current = now;
				lastInputCountRef.current = targetCountRef.current;
				startFrameLoop();
			}, [
				content,
				enabled,
				config,
				startFrameLoop,
				syncImmediate
			]);
			(0, react.useEffect)(() => {
				return () => {
					stopFrameLoop();
				};
			}, [stopFrameLoop]);
			return displayedContent;
		}
		//#endregion
		//#region src/client/FrameCoordinator.ts
		var FrameCoordinator = class FrameCoordinator {
			static coordinators = /* @__PURE__ */ new WeakMap();
			tasks = /* @__PURE__ */ new Map();
			rafId = null;
			lastTs = null;
			/**
			* Owed layout read. Starts false: a fresh coordinator has no unread writes,
			* and starting dirty would keep the clock armed forever after the first
			* frame. Consumers declare reads via {@link markLayoutDirty}.
			*/
			layoutDirty = false;
			/** One id per consumer, so an unregister cannot evict a re-registered task. */
			nextTaskId = 0;
			doc;
			constructor(doc) {
				this.doc = doc;
			}
			static forDocument(doc = document) {
				let coordinator = FrameCoordinator.coordinators.get(doc);
				if (coordinator === void 0) {
					coordinator = new FrameCoordinator(doc);
					FrameCoordinator.coordinators.set(doc, coordinator);
				}
				return coordinator;
			}
			/**
			* Mark that a DOM or geometry change requires a layout read next frame.
			*/
			markLayoutDirty() {
				this.layoutDirty = true;
				this.ensureLoop();
			}
			/**
			* Declare that geometry written since the last frame must be re-read at the
			* top of the next one, and keep the clock running for it.
			*/
			requestRead() {
				this.markLayoutDirty();
			}
			/**
			* Register or replace an animation/render task. Returns the task id to hand
			* back to {@link unregisterTask}.
			*/
			registerTask(task) {
				const id = task.id ?? `frame-task-${this.nextTaskId++}`;
				this.tasks.set(id, {
					...task,
					id
				});
				this.ensureLoop();
				return id;
			}
			/**
			* Unregister a task when its stream completes or the element unmounts.
			*/
			unregisterTask(id) {
				if (id === null || id === void 0) return;
				this.tasks.delete(id);
				if (this.tasks.size === 0 && !this.layoutDirty) this.stopLoop();
			}
			ensureLoop() {
				if (this.rafId !== null) return;
				const win = this.doc.defaultView ?? (typeof window !== "undefined" ? window : null);
				if (win === null) return;
				const tick = (now) => {
					this.rafId = null;
					if (this.lastTs === null) {
						this.lastTs = now;
						this.ensureLoop();
						return;
					}
					const frameIntervalMs = Math.max(0, now - this.lastTs);
					const dtMs = Math.max(1, Math.min(frameIntervalMs, 100));
					this.lastTs = now;
					if (this.layoutDirty) {
						this.layoutDirty = false;
						for (const task of this.tasks.values()) this.guard(task, "onRead", () => task.onRead?.(now));
					}
					let anyActive = false;
					for (const task of this.tasks.values()) if (this.guard(task, "onSimulate", () => task.onSimulate?.(dtMs, now)) === true) anyActive = true;
					for (const task of this.tasks.values()) this.guard(task, "onWrite", () => task.onWrite?.(now));
					if ((anyActive || this.layoutDirty) && this.rafId === null) this.ensureLoop();
					else if (!anyActive && !this.layoutDirty) this.lastTs = null;
				};
				this.rafId = win.requestAnimationFrame(tick);
			}
			/**
			* Run one task callback. On throw, evict the task (a task that failed once
			* is in an unknown state and would likely throw every frame) and report the
			* error asynchronously so it still surfaces in the console without
			* unwinding the current tick. The owner's later unregisterTask is a no-op.
			*/
			guard(task, phase, run) {
				try {
					return run();
				} catch (error) {
					if (this.tasks.get(task.id) === task) {
						this.tasks.delete(task.id);
						try {
							task.onEvict?.();
						} catch (teardownError) {
							setTimeout(() => {
								throw teardownError;
							}, 0);
						}
					}
					const wrapped = new Error(`[@local/dsh-think-box] frame task ${task.id} threw in ${phase}; task evicted`, { cause: error });
					setTimeout(() => {
						throw wrapped;
					}, 0);
					return;
				}
			}
			stopLoop() {
				if (this.rafId !== null) {
					(this.doc.defaultView ?? (typeof window !== "undefined" ? window : null))?.cancelAnimationFrame(this.rafId);
					this.rafId = null;
				}
				this.lastTs = null;
			}
			/**
			* Whether this document currently owns a live, still-needed animation
			* frame. A frame that is merely draining an owed read with no registered
			* task left is not considered active work.
			*/
			get active() {
				return this.rafId !== null && (this.tasks.size > 0 || this.layoutDirty);
			}
			/** Number of registered tasks; used by tests to pin the single-clock contract. */
			get taskCount() {
				return this.tasks.size;
			}
			/**
			* Release every task, drop any owed read, and stop the clock. Used by tests
			* for isolation; production consumers unregister their own task.
			*/
			shutdown() {
				this.tasks.clear();
				this.layoutDirty = false;
				this.stopLoop();
			}
		};
		//#endregion
		//#region \0dsh-css:/Users/wench/Documents/DS Harness/dsh-think-box-plugin/src/client/LogarithmicFade.module.css.mjs
		const css$2 = ".gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-0),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-0){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 0.0%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-1),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-1){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 3.22581%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-2),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-2){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 6.45161%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-3),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-3){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 9.67742%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-4),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-4){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 12.9032%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-5),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-5){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 16.129%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-6),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-6){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 19.3548%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-7),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-7){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 22.5807%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-8),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-8){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 25.8065%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-9),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-9){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 29.0323%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-10),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-10){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 32.2581%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-11),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-11){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 35.4839%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-12),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-12){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 38.7097%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-13),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-13){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 41.9355%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-14),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-14){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 45.1613%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-15),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-15){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 48.3871%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-16),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-16){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 51.6129%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-17),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-17){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 54.8387%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-18),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-18){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 58.0645%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-19),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-19){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 61.2903%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-20),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-20){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 64.5161%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-21),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-21){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 67.7419%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-22),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-22){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 70.9677%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-23),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-23){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 74.1936%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-24),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-24){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 77.4194%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-25),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-25){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 80.6452%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-26),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-26){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 83.871%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-27),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-27){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 87.0968%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-28),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-28){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 90.3226%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-29),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-29){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 93.5484%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-30),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-30){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 96.7742%, transparent)}.gbU3zq_scope::highlight(gbU3zq_dsh-think-box-log-fade-31),.gbU3zq_scope ::highlight(gbU3zq_dsh-think-box-log-fade-31){color:color-mix(in srgb, var(--dsh-think-box-fade-color,currentColor) 100.0%, transparent)}";
		const tagId$2 = "@local/dsh-think-box/LogarithmicFade.module.css";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@local/dsh-think-box";
				tag.dataset.pluginCss = tagId$2;
				document.head.appendChild(tag);
			}
			tag.textContent = css$2;
		}
		var LogarithmicFade_module_css_default = {
			"dsh-think-box-log-fade-1": "gbU3zq_dsh-think-box-log-fade-1",
			"dsh-think-box-log-fade-18": "gbU3zq_dsh-think-box-log-fade-18",
			"dsh-think-box-log-fade-22": "gbU3zq_dsh-think-box-log-fade-22",
			"dsh-think-box-log-fade-31": "gbU3zq_dsh-think-box-log-fade-31",
			"dsh-think-box-log-fade-19": "gbU3zq_dsh-think-box-log-fade-19",
			"dsh-think-box-log-fade-11": "gbU3zq_dsh-think-box-log-fade-11",
			"dsh-think-box-log-fade-10": "gbU3zq_dsh-think-box-log-fade-10",
			"dsh-think-box-log-fade-26": "gbU3zq_dsh-think-box-log-fade-26",
			"dsh-think-box-log-fade-28": "gbU3zq_dsh-think-box-log-fade-28",
			"dsh-think-box-log-fade-2": "gbU3zq_dsh-think-box-log-fade-2",
			"dsh-think-box-log-fade-24": "gbU3zq_dsh-think-box-log-fade-24",
			"scope": "gbU3zq_scope",
			"dsh-think-box-log-fade-14": "gbU3zq_dsh-think-box-log-fade-14",
			"dsh-think-box-log-fade-7": "gbU3zq_dsh-think-box-log-fade-7",
			"dsh-think-box-log-fade-8": "gbU3zq_dsh-think-box-log-fade-8",
			"dsh-think-box-log-fade-4": "gbU3zq_dsh-think-box-log-fade-4",
			"dsh-think-box-log-fade-0": "gbU3zq_dsh-think-box-log-fade-0",
			"dsh-think-box-log-fade-5": "gbU3zq_dsh-think-box-log-fade-5",
			"dsh-think-box-log-fade-6": "gbU3zq_dsh-think-box-log-fade-6",
			"dsh-think-box-log-fade-9": "gbU3zq_dsh-think-box-log-fade-9",
			"dsh-think-box-log-fade-16": "gbU3zq_dsh-think-box-log-fade-16",
			"dsh-think-box-log-fade-17": "gbU3zq_dsh-think-box-log-fade-17",
			"dsh-think-box-log-fade-12": "gbU3zq_dsh-think-box-log-fade-12",
			"dsh-think-box-log-fade-29": "gbU3zq_dsh-think-box-log-fade-29",
			"dsh-think-box-log-fade-25": "gbU3zq_dsh-think-box-log-fade-25",
			"dsh-think-box-log-fade-27": "gbU3zq_dsh-think-box-log-fade-27",
			"dsh-think-box-log-fade-21": "gbU3zq_dsh-think-box-log-fade-21",
			"dsh-think-box-log-fade-3": "gbU3zq_dsh-think-box-log-fade-3",
			"dsh-think-box-log-fade-15": "gbU3zq_dsh-think-box-log-fade-15",
			"dsh-think-box-log-fade-30": "gbU3zq_dsh-think-box-log-fade-30",
			"dsh-think-box-log-fade-23": "gbU3zq_dsh-think-box-log-fade-23",
			"dsh-think-box-log-fade-13": "gbU3zq_dsh-think-box-log-fade-13",
			"dsh-think-box-log-fade-20": "gbU3zq_dsh-think-box-log-fade-20"
		};
		const FADE_STEPS = 32;
		const PREFIX = "dsh-think-box-log-fade-";
		const COLOR_PROPERTY = "--dsh-think-box-fade-color";
		const highlightName = (index) => LogarithmicFade_module_css_default[`${PREFIX}${index}`] ?? `${PREFIX}${index}`;
		const EXCLUDED = "pre,code,math,.katex,.katex-display,mjx-container,svg,script,style,textarea,input,button,select,[role=\"button\"],[contenteditable],[hidden],[aria-hidden=\"true\"],[aria-live]";
		const EXCLUDED_ATTRIBUTES = [
			"hidden",
			"aria-hidden",
			"role",
			"contenteditable",
			"class"
		];
		const APPEARANCE_ATTRIBUTES = [
			"class",
			"style",
			"data-theme",
			"data-color-scheme",
			"data-appearance"
		];
		function logarithmicOpacity(progress) {
			return 0 + 1 * (1 - Math.log1p(5 * (1 - (Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1))) / Math.log(6));
		}
		function fadeTailSize(speedCps) {
			return Math.min(160, Math.max(24, Math.ceil((Number.isFinite(speedCps) ? Math.max(0, speedCps) : 0) * 240 / 1e3)));
		}
		const schedulers = /* @__PURE__ */ new WeakMap();
		const segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
		/**
		* Hot-path counters for the streaming benchmark. Increments only — this is the
		* evidence that the per-frame pass count collapsed, not a control input.
		*/
		const fadeHotPathStats = {
			/** Observer batches that reached reconcile(). */
			reconcileCalls: 0,
			/** Reconciles that did real work (the rest are dirty-check no-ops). */
			reconcilePasses: 0,
			/** Full text-node table rebuilds (structural DOM change). */
			nodeScans: 0,
			/** Forced style resolutions for newly faded elements. */
			styleReads: 0
		};
		function schedule(scheduler) {
			if (scheduler.taskId !== null || scheduler.pending.size === 0) return;
			scheduler.taskId = scheduler.coordinator.registerTask({
				onSimulate: (_dtMs, now) => {
					for (const client of scheduler.pending) if (!client.paint(now)) scheduler.pending.delete(client);
					if (scheduler.pending.size === 0) {
						scheduler.taskId = null;
						return false;
					}
					return true;
				},
				onEvict: () => {
					scheduler.taskId = null;
					for (const client of [...scheduler.pending]) client.dispose();
					scheduler.pending.clear();
				}
			});
		}
		/**
		* Whether an attribute record actually moved the attribute's value. jsdom (and
		* some engines) report a write even when the serialized value is unchanged, and
		* this controller writes the scope class on every enable/disable transition —
		* counting a no-op record as a DOM change would re-enter the observer forever.
		* Requires `attributeOldValue` on the observing call.
		* @param record - attribute mutation record from either observer.
		* @returns true only when the value differs from the recorded old value.
		*/
		function attributeChanged(record) {
			const attribute = record.attributeName;
			if (attribute === null) return true;
			return record.oldValue !== record.target.getAttribute(attribute);
		}
		/**
		* One appearance watcher per document. A theme switch arrives either as an OS
		* media-query flip (the app's default `preference: system`) or as an attribute
		* write on <html>/<body>, so both are observed; the fade only ever writes
		* custom properties on its own root, never on those elements, so this watcher
		* cannot observe the controller's own output.
		* @param scheduler - document-scoped registry notified when the look changes.
		* @returns teardown for the last client's dispose.
		*/
		function watchAppearance(scheduler) {
			const win = scheduler.window;
			const doc = win.document;
			const invalidate = () => {
				for (const client of scheduler.clients) client.invalidateColors();
			};
			const observer = new win.MutationObserver((records) => {
				if (records.some(attributeChanged)) invalidate();
			});
			const watched = doc.body === null ? [doc.documentElement] : [doc.documentElement, doc.body];
			for (const element of watched) observer.observe(element, {
				attributes: true,
				attributeFilter: APPEARANCE_ATTRIBUTES,
				attributeOldValue: true
			});
			const query = typeof win.matchMedia === "function" ? win.matchMedia("(prefers-color-scheme: dark)") : null;
			if (query !== null) query.addEventListener("change", invalidate);
			return () => {
				observer.disconnect();
				query?.removeEventListener("change", invalidate);
			};
		}
		function schedulerFor(root) {
			const doc = root.ownerDocument;
			const win = doc.defaultView;
			if (win === null) return null;
			const realm = win;
			if (typeof realm.Highlight !== "function" || !realm.CSS?.highlights || !realm.CSS.supports("color", "color-mix(in srgb, currentColor 15%, transparent)")) return null;
			let scheduler = schedulers.get(doc);
			if (scheduler === void 0) {
				const highlights = Array.from({ length: FADE_STEPS }, () => new realm.Highlight());
				for (const [index, highlight] of highlights.entries()) realm.CSS.highlights.set(highlightName(index), highlight);
				scheduler = {
					highlights,
					clients: /* @__PURE__ */ new Set(),
					pending: /* @__PURE__ */ new Set(),
					taskId: null,
					registry: realm.CSS.highlights,
					window: win,
					coordinator: FrameCoordinator.forDocument(doc),
					unwatchAppearance: () => {}
				};
				scheduler.unwatchAppearance = watchAppearance(scheduler);
				schedulers.set(doc, scheduler);
			}
			return scheduler;
		}
		/**
		* Owns ranges only: React retains ownership of every element and Text node.
		*
		* The controller used to re-derive its whole view of the subtree (textContent,
		* prefix walk, full TreeWalker, an O(tail x #nodes) filter) on *every* commit
		* AND on every observer batch for that same commit. It now keeps an
		* incremental text-node table, reconciles at most once per observed DOM
		* change, and preserves the per-element colour memo across passes.
		*/
		var LogarithmicFadeController = class LogarithmicFadeController {
			root;
			scheduler;
			previous = "";
			characters = [];
			colors = /* @__PURE__ */ new Map();
			enabled = false;
			active = false;
			speedCps = 100;
			pausedAt = null;
			disposed = false;
			observer;
			/** Text nodes of the root with their source offsets; survives data-only edits. */
			nodes = [];
			/** Ineligible nodes in nodes[0..index): a span is fadeable when its bounds match. */
			ineligiblePrefix = [0];
			/**
			* `closest(EXCLUDED)` derived once per element instead of once per Text node:
			* exclusion is inherited from the ancestor chain, so a memo stays usable only
			* while the element keeps its own parent. Moving a subtree into `code` — or
			* into anything else that matches — invalidates exactly the moved chain the
			* next time it is read.
			*/
			excludedElements = /* @__PURE__ */ new WeakMap();
			/** Own tag/attribute match per element; dropped when an exclusion attribute moves. */
			ownExcluded = /* @__PURE__ */ new WeakMap();
			/** Bumped by every observed mutation; reconcile() no-ops while it does not move. */
			domRevision = 0;
			/** Bumped only by structural (childList) mutations; the node table is rebuilt then. */
			structureRevision = 0;
			scannedStructureRevision = -1;
			reconciledRevision = -1;
			reconciledEnabled = false;
			reconciledActive = false;
			reconciledPaused = false;
			reconciledTailSize = 0;
			colorGeneration = 0;
			constructor(root, scheduler) {
				this.root = root;
				this.scheduler = scheduler;
				scheduler.clients.add(this);
				const win = root.ownerDocument.defaultView;
				this.observer = new win.MutationObserver((records) => {
					this.onDomMutation(records);
				});
				this.observer.observe(root, {
					subtree: true,
					childList: true,
					characterData: true,
					attributes: true,
					attributeFilter: EXCLUDED_ATTRIBUTES,
					attributeOldValue: true
				});
			}
			static create(root) {
				const scheduler = schedulerFor(root);
				return scheduler === null ? null : new LogarithmicFadeController(root, scheduler);
			}
			/** The element this controller currently paints fade ranges into. */
			get target() {
				return this.root;
			}
			update(enabled, active, speedCps = 100, paused = false) {
				const now = this.scheduler.window.performance.now();
				if (paused && this.pausedAt === null) this.pausedAt = now;
				if (!paused && this.pausedAt !== null) {
					const pauseDuration = now - this.pausedAt;
					for (const character of this.characters) character.born += pauseDuration;
					this.pausedAt = null;
				}
				this.enabled = enabled;
				this.active = active;
				this.speedCps = speedCps;
				this.reconcile();
			}
			/** Invalidate and reconcile from one observer batch (one batch per commit). */
			onDomMutation(records) {
				let changed = false;
				let exclusionAttributesMoved = false;
				for (const record of records) {
					if (record.type === "childList") {
						this.structureRevision += 1;
						changed = true;
						continue;
					}
					if (record.type === "characterData") {
						changed = true;
						continue;
					}
					if (!attributeChanged(record)) continue;
					exclusionAttributesMoved = true;
					changed = true;
				}
				if (!changed) return;
				if (exclusionAttributesMoved) {
					this.excludedElements = /* @__PURE__ */ new WeakMap();
					this.ownExcluded = /* @__PURE__ */ new WeakMap();
					this.structureRevision += 1;
				}
				this.domRevision += 1;
				this.reconcile();
			}
			/**
			* Whether this element matches a SKIP rule itself or inherits one from an
			* ancestor — the memoised form of `element.closest(EXCLUDED) !== null`.
			* Memoised per element and revalidated through the parent chain, so a node
			* that moves into `code` — or whose ancestor does — is re-decided without
			* paying the selector walk once per Text node per pass.
			* @param element - element owning the Text node being classified.
			* @returns true when text under this element must stay out of the fade.
			*/
			elementExcluded(element) {
				const cached = this.excludedElements.get(element);
				if (cached !== void 0 && cached.parent === element.parentElement) return cached.excluded;
				const parent = element.parentElement;
				const inherited = element === this.root || parent === null ? false : this.elementExcluded(parent);
				let own = this.ownExcluded.get(element);
				if (own === void 0) {
					own = element.matches(EXCLUDED);
					this.ownExcluded.set(element, own);
				}
				const excluded = inherited || own;
				this.excludedElements.set(element, {
					parent,
					excluded
				});
				return excluded;
			}
			/** Rebuild the text-node table after a structural change. */
			scanNodes() {
				const nodes = [];
				const walker = this.root.ownerDocument.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
				for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
					const text = node;
					const parent = text.parentElement;
					const eligible = parent !== null && !this.elementExcluded(parent);
					nodes.push({
						node: text,
						start: 0,
						end: 0,
						eligible
					});
				}
				this.nodes = nodes;
				this.scannedStructureRevision = this.structureRevision;
				fadeHotPathStats.nodeScans += 1;
			}
			/**
			* Re-derive the source text, the per-node spans and the eligibility prefix
			* sums from the cached table. No DOM read, no selector match, no allocation
			* beyond the string itself.
			*/
			readText() {
				if (this.scannedStructureRevision !== this.structureRevision) this.scanNodes();
				for (const entry of this.nodes) {
					if (entry.node.parentNode !== null) continue;
					this.scanNodes();
					break;
				}
				const nodes = this.nodes;
				const prefix = this.ineligiblePrefix;
				if (prefix.length < nodes.length + 1) prefix.length = nodes.length + 1;
				prefix[0] = 0;
				let text = "";
				let offset = 0;
				for (let index = 0; index < nodes.length; index += 1) {
					const entry = nodes[index];
					const data = entry.node.data;
					entry.start = offset;
					offset += data.length;
					entry.end = offset;
					text += data;
					prefix[index + 1] = prefix[index] + (entry.eligible ? 0 : 1);
				}
				prefix.length = nodes.length + 1;
				this.ineligiblePrefix = prefix;
				return text;
			}
			/** First cached node whose span ends after `offset` (binary search). */
			firstNodeEndingAfter(offset) {
				const nodes = this.nodes;
				let low = 0;
				let high = nodes.length;
				while (low < high) {
					const mid = low + high >> 1;
					if (nodes[mid].end > offset) high = mid;
					else low = mid + 1;
				}
				return low;
			}
			/** Last cached node whose span starts before `offset` (binary search). */
			lastNodeStartingBefore(offset) {
				const nodes = this.nodes;
				let low = -1;
				let high = nodes.length - 1;
				while (low < high) {
					const mid = low + high + 1 >> 1;
					if (nodes[mid].start < offset) low = mid;
					else high = mid - 1;
				}
				return low;
			}
			clearRanges() {
				for (const character of this.characters) this.scheduler.highlights[character.bucket]?.delete(character.range);
				this.characters = [];
			}
			restoreColor(element, preserved) {
				if (preserved.value === "") element.style.removeProperty(COLOR_PROPERTY);
				else element.style.setProperty(COLOR_PROPERTY, preserved.value, preserved.priority);
			}
			rootColorSet = false;
			/** The root's own inline value/priority before the fade overwrote it. */
			rootColorPreserved;
			ensureRootColor() {
				if (this.rootColorSet) return;
				this.rootColorPreserved = {
					value: this.root.style.getPropertyValue(COLOR_PROPERTY),
					priority: this.root.style.getPropertyPriority(COLOR_PROPERTY),
					generation: this.colorGeneration
				};
				const color = this.scheduler.window.getComputedStyle(this.root).color || "currentColor";
				this.root.style.setProperty(COLOR_PROPERTY, color);
				this.rootColorSet = true;
			}
			restoreColors() {
				if (this.rootColorSet) {
					const preserved = this.rootColorPreserved;
					if (preserved === void 0 || preserved.value === "") this.root.style.removeProperty(COLOR_PROPERTY);
					else this.root.style.setProperty(COLOR_PROPERTY, preserved.value, preserved.priority);
					this.rootColorSet = false;
					this.rootColorPreserved = void 0;
				}
				for (const [element, preserved] of this.colors) this.restoreColor(element, preserved);
				this.colors.clear();
			}
			/**
			* The document's appearance moved (theme switch, restyle): the captured ink
			* colour is stale, so drop it and let the next pass read the new one. Costs
			* nothing while no colour is captured, which is the common case — the read
			* still happens only when text is actually fading.
			*/
			invalidateColors() {
				if (this.disposed || !this.rootColorSet && this.colors.size === 0) return;
				this.restoreColors();
				this.domRevision += 1;
				this.reconcile();
			}
			/**
			* Refresh the fade ranges. Two triggers used to run this 2-3x per frame with
			* no dirty check: the commit-driven `update()` and the observer batch for the
			* very same DOM write. Both converge here, and the pass is skipped unless the
			* DOM revision, the gate, the fade window or the pause state actually moved.
			*/
			reconcile() {
				if (this.disposed) return;
				fadeHotPathStats.reconcileCalls += 1;
				const tailSize = fadeTailSize(this.speedCps);
				const paused = this.pausedAt !== null;
				const domChanged = this.domRevision !== this.reconciledRevision;
				const paramsChanged = this.enabled !== this.reconciledEnabled || this.active !== this.reconciledActive || paused !== this.reconciledPaused || tailSize !== this.reconciledTailSize && this.characters.length > 0;
				if (!domChanged && !paramsChanged) return;
				fadeHotPathStats.reconcilePasses += 1;
				this.reconciledRevision = this.domRevision;
				this.reconciledEnabled = this.enabled;
				this.reconciledActive = this.active;
				this.reconciledPaused = paused;
				this.reconciledTailSize = tailSize;
				const text = this.readText();
				const previous = this.previous;
				this.previous = text;
				const old = this.characters;
				this.clearRanges();
				if (!this.enabled) {
					this.root.classList.remove(LogarithmicFade_module_css_default.scope);
					this.restoreColors();
					this.scheduler.pending.delete(this);
					this.stopIfIdle();
					return;
				}
				this.root.classList.add(LogarithmicFade_module_css_default.scope);
				this.ensureRootColor();
				const now = this.pausedAt ?? this.scheduler.window.performance.now();
				const appended = text.startsWith(previous);
				let prefix = appended ? previous.length : 0;
				if (!appended) while (prefix < previous.length && prefix < text.length && previous[prefix] === text[prefix]) prefix += 1;
				const nodes = this.nodes;
				const ineligible = this.ineligiblePrefix;
				const oldestLiveStart = old.reduce((start, character) => now - character.born < 240 && character.end <= prefix ? Math.min(start, character.start) : start, Infinity);
				const retainedBySpan = /* @__PURE__ */ new Map();
				for (const character of old) retainedBySpan.set(`${String(character.start)}:${String(character.end)}`, character);
				this.colorGeneration += 1;
				const windowStart = Math.max(0, Math.min(text.length - 320, oldestLiveStart < Infinity ? oldestLiveStart : text.length));
				const tailText = windowStart > 0 ? text.slice(windowStart) : text;
				const segments = segmenter.segment(tailText);
				let end = text.length;
				for (let count = 0; count < 160 && end > 0 && (count < tailSize || end > oldestLiveStart); count += 1) {
					const localEnd = end - windowStart;
					if (localEnd <= 0) break;
					const segment = segments.containing(localEnd - 1);
					if (segment === void 0) break;
					const start = segment.index + windowStart;
					const born = (end <= prefix ? retainedBySpan.get(`${String(start)}:${String(end)}`) : void 0)?.born ?? (this.active && appended && start >= previous.length ? now : null);
					if (born !== null && now - born < 240 && segment.segment.trim() !== "") {
						const first = this.firstNodeEndingAfter(start);
						const last = this.lastNodeStartingBefore(end);
						if (last >= first && first < nodes.length && nodes[last].end > start && ineligible[last + 1] === ineligible[first]) {
							const firstPart = nodes[first];
							const lastPart = nodes[last];
							const range = this.root.ownerDocument.createRange();
							range.setStart(firstPart.node, start - firstPart.start);
							range.setEnd(lastPart.node, end - lastPart.start);
							this.characters.push({
								start,
								end,
								born,
								range,
								bucket: -1
							});
						}
					}
					end = start;
				}
				if (this.paint(now)) {
					if (this.pausedAt === null) {
						this.scheduler.pending.add(this);
						schedule(this.scheduler);
					} else {
						this.scheduler.pending.delete(this);
						this.stopIfIdle();
					}
				} else {
					this.scheduler.pending.delete(this);
					this.stopIfIdle();
				}
			}
			paint(now) {
				this.characters = this.characters.filter((character) => {
					const progress = (now - character.born) / 240;
					if (progress >= 1 || !this.root.isConnected || !this.root.contains(character.range.startContainer)) {
						this.scheduler.highlights[character.bucket]?.delete(character.range);
						return false;
					}
					const bucket = Math.min(31, Math.round((logarithmicOpacity(progress) - 0) / 1 * 31));
					if (bucket !== character.bucket) {
						this.scheduler.highlights[character.bucket]?.delete(character.range);
						this.scheduler.highlights[bucket].add(character.range);
						character.bucket = bucket;
					}
					return true;
				});
				if (this.characters.length === 0) this.restoreColors();
				return this.characters.length > 0;
			}
			stopIfIdle() {
				if (this.scheduler.pending.size !== 0) return;
				if (this.scheduler.taskId === null) return;
				this.scheduler.coordinator.unregisterTask(this.scheduler.taskId);
				this.scheduler.taskId = null;
			}
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.observer.disconnect();
				this.clearRanges();
				this.restoreColors();
				this.nodes = [];
				this.scannedStructureRevision = -1;
				this.root.classList.remove(LogarithmicFade_module_css_default.scope);
				this.scheduler.pending.delete(this);
				this.scheduler.clients.delete(this);
				this.stopIfIdle();
				if (this.scheduler.clients.size === 0) {
					for (const [index, highlight] of this.scheduler.highlights.entries()) {
						const name = highlightName(index);
						if (this.scheduler.registry.get(name) === highlight) this.scheduler.registry.delete(name);
					}
					this.scheduler.unwatchAppearance();
					schedulers.delete(this.root.ownerDocument);
				}
			}
		};
		/** active admits new characters; enabled=false also cancels completion linger. */
		function useLogarithmicFade(rootRef, enabled, active, speedCpsRef, paused = false) {
			const controller = (0, react.useRef)(null);
			const committed = (0, react.useRef)(false);
			(0, react.useLayoutEffect)(() => {
				return () => {
					controller.current?.dispose();
					controller.current = null;
				};
			}, [rootRef]);
			(0, react.useLayoutEffect)(() => {
				const root = rootRef.current;
				if (!enabled) {
					if (controller.current !== null) {
						controller.current.dispose();
						controller.current = null;
					}
					committed.current = true;
					return;
				}
				if (controller.current !== null && root !== null && controller.current.target !== root) {
					controller.current.dispose();
					controller.current = null;
				}
				if (controller.current === null && root !== null && active) {
					controller.current = LogarithmicFadeController.create(root);
					if (committed.current) controller.current?.update(false, false);
				}
				controller.current?.update(enabled, active, speedCpsRef?.current, paused);
				committed.current = true;
			});
		}
		//#endregion
		//#region src/client/reasoningTranslation.ts
		/** Rejection carrying the bundle's diagnostic code. */
		var TranslationFailure = class extends Error {
			code;
			constructor(code, message) {
				super(message);
				this.name = "TranslationFailure";
				this.code = code;
			}
		};
		/** Preferred source size per request: keeps one long chain a few requests. */
		const PREFERRED_FRAGMENT_CHARS = 480;
		/** Search window (share of the limit) for a whitespace split inside a long line. */
		const LONG_LINE_SEARCH_RATIO = .6;
		/** Saved results kept by this browser for re-expansion across blocks. */
		const MAX_CACHED_TRANSLATIONS$1 = 512;
		/** How long one set of accepted preferences is reused before re-reading. */
		const LIMITS_TTL_MS = 5e3;
		/** Pick a split offset no larger than `limit`, preferring a word boundary. */
		function splitOffset(text, limit) {
			if (text.length <= limit) return text.length;
			let cut = limit;
			const code = text.charCodeAt(cut - 1);
			if (code >= 55296 && code <= 56319) cut -= 1;
			const floor = Math.max(1, Math.floor(limit * LONG_LINE_SEARCH_RATIO));
			const space = text.lastIndexOf(" ", cut);
			if (space >= floor) return space + 1;
			const newline = text.lastIndexOf("\n", cut);
			if (newline >= floor) return newline + 1;
			return cut;
		}
		/**
		* Split displayed reasoning into complete translatable fragments and the
		* incomplete tail that must stay in the original language.
		*
		* Fragments end at line boundaries, batch a few lines together, and are always
		* within the provider's request limit. A line longer than the limit (a
		* streamed paragraph with no newline yet) feeds its prefix once the prefix is
		* long enough, mirroring the bundled UI.
		*
		* @param text - the reasoning block's visible text.
		* @param maxTextChars - provider limit in UTF-16 code units.
		* @param complete - true once the block stopped streaming: the trailing line
		*   then counts as final text and is translated too. While the block streams,
		*   the unfinished tail stays in the original language.
		* @returns the split fragments plus their leading/trailing original whitespace.
		*/
		function planTranslationFragments(text, maxTextChars, complete = true) {
			const limit = Math.max(1, Math.floor(maxTextChars));
			const threshold = Math.min(PREFERRED_FRAGMENT_CHARS, limit);
			const fragments = [];
			let leading = "";
			let tail = "";
			const push = (raw) => {
				if (raw === "") return;
				const suffix = /(\s*)$/u.exec(raw)?.[1] ?? "";
				const source = raw.slice(0, raw.length - suffix.length);
				if (source === "") {
					const previous = fragments.at(-1);
					if (previous === void 0) leading += raw;
					else previous.suffix += raw;
					return;
				}
				fragments.push({
					source,
					suffix
				});
			};
			const lines = [];
			let lineStart = 0;
			for (;;) {
				const newline = text.indexOf("\n", lineStart);
				if (newline === -1) {
					tail = text.slice(lineStart);
					break;
				}
				lines.push(text.slice(lineStart, newline + 1));
				lineStart = newline + 1;
			}
			let pending = "";
			for (const line of lines) {
				let rest = line;
				while (rest.length > limit) {
					const cut = splitOffset(rest, limit);
					pending += rest.slice(0, cut);
					rest = rest.slice(cut);
					push(pending);
					pending = "";
				}
				pending += rest;
				const blankLine = /^\s*$/u.test(rest.replace(/\n$/u, ""));
				if (pending.length >= threshold || blankLine) {
					push(pending);
					pending = "";
				}
			}
			push(pending);
			while (tail.length >= limit) {
				const cut = splitOffset(tail, limit);
				push(tail.slice(0, cut));
				tail = tail.slice(cut);
			}
			if (complete && tail !== "") {
				let rest = tail;
				tail = "";
				while (rest !== "") {
					const cut = rest.length > limit ? splitOffset(rest, limit) : rest.length;
					push(rest.slice(0, cut));
					rest = rest.slice(cut);
				}
			}
			return {
				leading,
				fragments,
				tail
			};
		}
		/**
		* Build the think box's translation face over the bundle Remote.
		* @param remote - the mounted `remote.cotTranslation` service.
		* @param activeLocale - reads the current UI locale for `auto` preferences.
		* @returns a face the reasoning hook can drive.
		*/
		function createReasoningTranslationFace(remote, activeLocale) {
			const cache = /* @__PURE__ */ new Map();
			let accepted;
			return {
				async prepare(signal) {
					const now = Date.now();
					if (accepted !== void 0 && now - accepted.at < LIMITS_TTL_MS) return accepted.plan;
					const result = await remote.limits(signal);
					if (!result.ok) throw new TranslationFailure(result.error.code ?? "translation/unavailable", result.error.message ?? "translation unavailable");
					const { maxTextChars, preferences, availableProviders } = result.value;
					if (!availableProviders.includes(preferences.provider)) throw new TranslationFailure("translation/provider-unavailable", `translation provider ${preferences.provider} is unavailable`);
					const targetLanguage = preferences.targetLanguage === "auto" ? activeLocale() : preferences.targetLanguage;
					const plan = {
						provider: preferences.provider,
						targetLanguage,
						maxTextChars
					};
					accepted = {
						plan,
						at: now
					};
					return plan;
				},
				async translate(source, plan, sessionId, signal) {
					if (source.trim() === "") return "";
					const key = `${plan.provider}\u0000${plan.targetLanguage}\u0000${source}`;
					const hit = cache.get(key);
					if (hit !== void 0) return hit;
					const result = await remote.translate({
						text: source,
						provider: plan.provider,
						targetLanguage: plan.targetLanguage,
						...sessionId === void 0 ? {} : { sessionId }
					}, signal);
					if (!result.ok) throw new TranslationFailure(result.error.code ?? "translation/failed", result.error.message ?? "translation failed");
					if (cache.size >= MAX_CACHED_TRANSLATIONS$1) cache.clear();
					cache.set(key, result.value);
					return result.value;
				}
			};
		}
		//#endregion
		//#region src/client/useReasoningTranslation.ts
		/**
		* Per-reasoning-block translation state for the think box.
		*
		* Translation can be opt-in or automatic: the reader either clicks the toggle
		* once, or the runtime's `autoTranslate` preference switches a block that is
		* already streaming. In both cases the whole block follows the translated
		* feed, including fragments that complete while the model is still thinking.
		* The displayed string keeps the reveal engine's input contract - complete
		* fragments have translations, the unfinished tail stays in the original
		* language - so the typewriter reveal keeps running on the translated feed
		* instead of waiting for the whole block to settle.
		*/
		const IDLE_SNAPSHOT = {
			pending: false,
			failed: false,
			generation: 0
		};
		/**
		* Imperative translation scheduler for one reasoning block.
		*
		* React owns the view mode (original/translated); this engine owns the plan,
		* the per-fragment queue, and the in-memory results. It only schedules work
		* while the translated view is active, so leaving the original feed untouched
		* never sends reasoning text anywhere.
		*/
		var ReasoningTranslationEngine = class {
			face;
			notify;
			text = "";
			complete = true;
			active = false;
			sessionId;
			plan;
			planFailure = false;
			preparing = false;
			running = false;
			controller;
			enqueuedText = "";
			results = /* @__PURE__ */ new Map();
			failedSources = /* @__PURE__ */ new Set();
			inFlight = /* @__PURE__ */ new Set();
			queue = [];
			fragments;
			snapshot = IDLE_SNAPSHOT;
			generation = 0;
			constructor(face, notify) {
				this.face = face;
				this.notify = notify;
			}
			getSnapshot() {
				return this.snapshot;
			}
			/**
			* Feed the latest view state. Text growth while active schedules the new
			* complete fragments; a rewrite of the block resets the saved results.
			*/
			update(text, active, sessionId, complete) {
				this.sessionId = sessionId;
				const textChanged = text !== this.text;
				this.complete = complete;
				if (!active) {
					if (this.active) {
						this.active = false;
						this.cancel();
						this.preparing = false;
						this.publish();
					}
					this.text = text;
					return;
				}
				if (!this.active) {
					this.active = true;
					this.cancel();
					this.controller = new AbortController();
					this.failedSources.clear();
					this.planFailure = false;
				}
				if (textChanged) {
					if (!text.startsWith(this.text)) {
						this.results.clear();
						this.generation += 1;
					}
					this.text = text;
				}
				this.publish();
				this.run();
			}
			/**
			* Build the displayed feed for the given source text. Pure read for the
			* render pass: untranslated fragments keep their source text, so the feed
			* only differs from the original where a translation actually landed.
			*/
			displayFor(text) {
				const plan = this.plan;
				if (!this.active || plan === void 0) return text;
				const planned = this.planFor(text, plan.maxTextChars, this.complete);
				let output = planned.leading;
				for (const fragment of planned.fragments) output += (this.results.get(fragment.source) ?? fragment.source) + fragment.suffix;
				return output + planned.tail;
			}
			/** Clear failures (and a failed plan read) and dispatch the missing pieces again. */
			retry() {
				if (!this.active) return;
				this.failedSources.clear();
				this.planFailure = false;
				this.cancel();
				this.controller = new AbortController();
				this.publish();
				this.run();
			}
			dispose() {
				this.active = false;
				this.cancel();
			}
			planFor(text, limit, complete) {
				const cached = this.fragments;
				if (cached !== void 0 && cached.text === text && cached.limit === limit && cached.complete === complete) return cached.value;
				const value = planTranslationFragments(text, limit, complete);
				this.fragments = {
					text,
					limit,
					complete,
					value
				};
				return value;
			}
			publish() {
				const pending = this.active && (this.preparing || this.queue.length > 0 || this.inFlight.size > 0);
				const failed = this.active && (this.planFailure || this.failedSources.size > 0);
				if (this.snapshot.pending === pending && this.snapshot.failed === failed && this.snapshot.generation === this.generation) return;
				this.snapshot = {
					pending,
					failed,
					generation: this.generation
				};
				this.notify(this.snapshot);
			}
			cancel() {
				this.controller?.abort();
				this.controller = void 0;
				this.queue.length = 0;
				this.inFlight.clear();
			}
			async ensurePlan(signal) {
				this.preparing = true;
				this.publish();
				try {
					const plan = await this.face.prepare(signal);
					if (this.active && !signal.aborted) this.plan = plan;
				} catch {
					if (this.active && !signal.aborted) this.planFailure = true;
				} finally {
					this.preparing = false;
					this.publish();
				}
			}
			enqueue() {
				this.enqueuedText = this.text;
				const plan = this.plan;
				if (plan === void 0) return;
				for (const fragment of this.planFor(this.text, plan.maxTextChars, this.complete).fragments) {
					const source = fragment.source;
					if (this.results.has(source) || this.failedSources.has(source) || this.inFlight.has(source)) continue;
					if (this.queue.includes(source)) continue;
					this.queue.push(source);
				}
			}
			async run() {
				if (this.running || !this.active) return;
				this.running = true;
				try {
					for (;;) {
						if (!this.active) return;
						const controller = this.controller;
						if (controller === void 0 || controller.signal.aborted) return;
						if (this.plan === void 0) {
							if (this.planFailure) return;
							await this.ensurePlan(controller.signal);
							if (!this.active || this.plan === void 0) return;
						}
						this.enqueue();
						const source = this.queue.shift();
						if (source === void 0) return;
						if (this.results.has(source) || this.failedSources.has(source) || this.inFlight.has(source)) continue;
						this.inFlight.add(source);
						this.publish();
						try {
							const translated = await this.face.translate(source, this.plan, this.sessionId, controller.signal);
							if (!this.active) return;
							this.results.set(source, translated);
							this.generation += 1;
						} catch {
							if (!this.active || controller.signal.aborted) return;
							this.failedSources.add(source);
						} finally {
							this.inFlight.delete(source);
						}
						this.publish();
					}
				} finally {
					this.running = false;
					if (this.active && this.enqueuedText !== this.text) this.run();
				}
			}
		};
		/**
		* Drive translation for one reasoning block.
		* @param text - the block's current source text.
		* @param sessionId - owning Session, so the bundle can save and reuse results.
		* @param face - mounted bundle Remote, or undefined while the bundle is off.
		* @param complete - false while the block still streams; the trailing line is
		*   then left in the original language until the block settles.
		* @returns the toggle state and the feed to display.
		*/
		function useReasoningTranslation(text, sessionId, face, complete, autoActive = false) {
			const [autoLatched, setAutoLatched] = (0, react.useState)(false);
			const [choice, setChoice] = (0, react.useState)(void 0);
			const [snapshot, setSnapshot] = (0, react.useState)(IDLE_SNAPSHOT);
			const engineRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				if (autoActive) setAutoLatched(true);
			}, [autoActive]);
			(0, react.useLayoutEffect)(() => {
				if (face === void 0) return;
				const engine = new ReasoningTranslationEngine(face, setSnapshot);
				engineRef.current = engine;
				return () => {
					engine.dispose();
					if (engineRef.current === engine) engineRef.current = void 0;
				};
			}, [face]);
			const active = face !== void 0 && (choice ?? autoLatched);
			(0, react.useLayoutEffect)(() => {
				engineRef.current?.update(text, active, sessionId, complete);
			}, [
				text,
				active,
				sessionId,
				face,
				complete
			]);
			(0, react.useLayoutEffect)(() => {
				if (face !== void 0) return;
				setAutoLatched(false);
				setChoice(void 0);
				setSnapshot(IDLE_SNAPSHOT);
			}, [face]);
			const toggle = (0, react.useCallback)(() => {
				if (face === void 0) return;
				setChoice(!active);
			}, [face, active]);
			const retry = (0, react.useCallback)(() => {
				engineRef.current?.retry();
			}, []);
			const translated = active && face !== void 0;
			return {
				available: face !== void 0 && text.trim() !== "",
				active: translated,
				displayText: translated ? engineRef.current?.displayFor(text) ?? text : text,
				pending: translated && snapshot.pending,
				failed: translated && snapshot.failed,
				toggle,
				retry
			};
		}
		//#endregion
		//#region src/client/ReasoningAssistantNodeView.tsx
		function usePrefersReducedMotion() {
			const [reduced, setReduced] = (0, react.useState)(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);
			(0, react.useEffect)(() => {
				if (typeof window === "undefined" || window.matchMedia === void 0) return;
				const query = window.matchMedia("(prefers-reduced-motion: reduce)");
				const onChange = () => setReduced(query.matches);
				query.addEventListener("change", onChange);
				return () => query.removeEventListener("change", onChange);
			}, []);
			return reduced;
		}
		function imageLabels(t) {
			return {
				image: t("image.label"),
				open: t("image.openOriginal"),
				openNamed: (label) => t("image.openOriginalLabel", { label }),
				loading: t("image.loading"),
				loadFailed: t("image.loadFailed"),
				lightbox: {
					dialog: t("image.preview"),
					close: t("image.closePreview")
				}
			};
		}
		/**
		* Apply searchable hidden state without unmounting a stable subtree 鈥?the
		* Host's completion fold hides the answer-inline reasoning this way, so the
		* takeover renderer must reproduce it to stay inside the contract: the row
		* disappears into the Host's process summary and comes back on find-in-page.
		* (Mirrors the Harness chat kit's `useSearchableHidden`.)
		*/
		function useSearchableHidden(hidden, reveal) {
			const ref = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const element = ref.current;
				if (element === null) return;
				if (hidden && element.contains(element.ownerDocument.activeElement)) {
					reveal();
					return;
				}
				if (hidden) element.setAttribute("hidden", "until-found");
				else element.removeAttribute("hidden");
			}, [hidden, reveal]);
			(0, react.useEffect)(() => {
				const element = ref.current;
				if (element === null) return;
				element.addEventListener("beforematch", reveal);
				return () => {
					element.removeEventListener("beforematch", reveal);
				};
			}, [reveal]);
			return ref;
		}
		/**
		* One answer-inline reasoning block wrapped in the Host's fold contract. The
		* Host computes the fold decision (turn closed, compact transcript, this node
		* is the answer) and delivers it through the `turnProcess` owner prop; when
		* folded the block hides into the Host's "thought" summary row instead of
		* staying mounted above the answer.
		*/
		function FoldableReasoning({ hidden, reveal, children }) {
			const ref = useSearchableHidden(hidden, reveal);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref,
				"data-turn-process-inline": hidden || void 0,
				children
			});
		}
		/** How much of a burst survives into the motion: the rate smoother's time constant. */
		const BELT_TAU_MS = 400;
		/** The belt never quite stops while a stream is live, and never rips. */
		const BELT_MIN_PX_PER_SEC = 90;
		const BELT_MAX_PX_PER_SEC = 800;
		/** Rate a box starts from, before it has measured anything. */
		const BELT_START_PX_PER_SEC = 150;
		const emptyBelt = () => ({
			el: null,
			cursor: 0,
			rate: BELT_START_PX_PER_SEC,
			height: 0
		});
		/**
		* Re-anchor the belt to where the box actually is, so following can resume
		* without a jump after the reader took the position over.
		* @param el - the scrolling box.
		* @param belt - the tracker to re-anchor.
		*/
		function beltSync(el, belt) {
			belt.el = el;
			belt.cursor = el.scrollTop;
			belt.height = el.scrollHeight;
			belt.rate = BELT_START_PX_PER_SEC;
		}
		/**
		* Advance the belt one frame: smooth the producer's rate, then drain at it.
		* @param el - the scrolling box.
		* @param belt - per-box tracker.
		* @param dtMs - frame time in ms.
		* @param drain - true once the producer stopped. The rate is then held instead
		*   of smoothed, so the landing continues at the speed already on screen.
		* @returns the scrollTop to apply.
		*/
		function beltStep(el, belt, dtMs, drain) {
			const dt = Math.min(100, Math.max(1, dtMs));
			if (belt.el !== el) {
				belt.el = el;
				belt.cursor = Math.max(0, el.scrollHeight - el.clientHeight);
				belt.height = el.scrollHeight;
			}
			if (!drain) {
				const produced = (el.scrollHeight - belt.height) / dt * 1e3;
				const k = 1 - Math.exp(-dt / BELT_TAU_MS);
				belt.rate += (produced - belt.rate) * k;
				belt.rate = Math.min(BELT_MAX_PX_PER_SEC, Math.max(BELT_MIN_PX_PER_SEC, belt.rate));
			}
			belt.height = el.scrollHeight;
			const bottom = Math.max(0, el.scrollHeight - el.clientHeight);
			belt.cursor = Math.max(0, Math.min(belt.cursor + belt.rate * dt / 1e3, bottom));
			return belt.cursor;
		}
		/**
		* Nearest scrollable ancestor: the port a disclosure toggle has to compensate
		* its layout shift in.
		* @param el - element to start walking up from.
		* @returns the scrolling ancestor, or null when nothing up the tree scrolls.
		*/
		function scrollParentOf(el) {
			let node = el.parentElement;
			while (node !== null) {
				const overflow = getComputedStyle(node).overflowY;
				if (overflow === "auto" || overflow === "scroll") return node;
				node = node.parentElement;
			}
			return null;
		}
		/**
		* Built-in Think disclosure with a smoothed `text` feed. Chevron and row
		* click stay on the disclosure chrome, which the plugin's AnimatedDisclosure
		* renders with a height-animated body (the harness primitive would mount and
		* unmount it, which cannot glide). The row opens only while this block is
		* the streaming tail and closes as soon as thinking ends 鈥?a later block,
		* or the assistant node settling 鈥?not when the rest of the reply is
		* still streaming.
		*/
		function AnimatedReasoning({ text, running, turnStreaming, thinkAutoExpand, sessionId, translation, translationLabel, autoTranslate, t }) {
			const reduced = usePrefersReducedMotion();
			const translationControl = useReasoningTranslation(text, sessionId, translation, !running, autoTranslate && running);
			const sourceText = translationControl.displayText;
			const [settled, setSettled] = (0, react.useState)(!running && !turnStreaming);
			const wasRunningRef = (0, react.useRef)(running);
			const flourishedRef = (0, react.useRef)(false);
			const liveRef = (0, react.useRef)(running || turnStreaming);
			if (running || turnStreaming) liveRef.current = true;
			const [expanded, setExpanded] = (0, react.useState)(false);
			const inlineRef = (0, react.useRef)(null);
			const fadeRootRef = (0, react.useRef)(null);
			const activeRef = expanded ? fadeRootRef : inlineRef;
			const beltRef = (0, react.useRef)(emptyBelt());
			const fadeSpeedRef = (0, react.useRef)(35);
			const userScrolledRef = (0, react.useRef)(false);
			const rafIdRef = (0, react.useRef)(0);
			const followActiveRef = (0, react.useRef)(false);
			followActiveRef.current = running && thinkAutoExpand;
			const commitAnchorRef = (0, react.useRef)(null);
			const displayed = useReasoningReveal(sourceText, {
				enabled: running && !reduced,
				speedCpsRef: fadeSpeedRef
			});
			const shown = running && !reduced ? displayed : sourceText;
			useLogarithmicFade(activeRef, !reduced, running, fadeSpeedRef);
			(0, react.useEffect)(() => {
				if (!running || !thinkAutoExpand) return;
				const el = activeRef.current;
				if (el === null) return;
				let last = 0;
				const glide = (ts) => {
					rafIdRef.current = requestAnimationFrame(glide);
					const dt = last === 0 ? 16.667 : ts - last;
					last = ts;
					if (!followActiveRef.current) return;
					if (userScrolledRef.current) {
						beltSync(el, beltRef.current);
						return;
					}
					el.scrollTop = beltStep(el, beltRef.current, dt, false);
				};
				rafIdRef.current = requestAnimationFrame(glide);
				return () => {
					if (rafIdRef.current !== 0) {
						cancelAnimationFrame(rafIdRef.current);
						rafIdRef.current = 0;
					}
				};
			}, [
				running,
				expanded,
				thinkAutoExpand,
				reduced
			]);
			(0, react.useEffect)(() => {
				return () => {
					if (rafIdRef.current !== 0) {
						cancelAnimationFrame(rafIdRef.current);
						rafIdRef.current = 0;
					}
				};
			}, []);
			(0, react.useEffect)(() => {
				userScrolledRef.current = false;
				const el = activeRef.current;
				if (el === null) return;
				let isPointerDown = false;
				const onWheel = (e) => {
					if (e.deltaY < 0) userScrolledRef.current = true;
					else if (e.deltaY > 0) {
						if (el.scrollHeight - el.scrollTop - el.clientHeight <= 30) userScrolledRef.current = false;
					}
				};
				const onPointerDown = () => {
					isPointerDown = true;
				};
				const onPointerUp = () => {
					isPointerDown = false;
				};
				const onScroll = () => {
					if (el.scrollHeight - el.scrollTop - el.clientHeight <= 30) userScrolledRef.current = false;
					else if (isPointerDown) userScrolledRef.current = true;
				};
				el.addEventListener("wheel", onWheel, { passive: true });
				el.addEventListener("pointerdown", onPointerDown, { passive: true });
				window.addEventListener("pointerup", onPointerUp, { passive: true });
				window.addEventListener("pointercancel", onPointerUp, { passive: true });
				el.addEventListener("scroll", onScroll, { passive: true });
				return () => {
					el.removeEventListener("wheel", onWheel);
					el.removeEventListener("pointerdown", onPointerDown);
					window.removeEventListener("pointerup", onPointerUp);
					window.removeEventListener("pointercancel", onPointerUp);
					el.removeEventListener("scroll", onScroll);
				};
			}, [expanded]);
			(0, react.useEffect)(() => {
				if (!running) return;
				const el = inlineRef.current;
				if (el !== null) beltSync(el, beltRef.current);
			}, [running]);
			(0, react.useEffect)(() => {
				const wasRunning = wasRunningRef.current;
				wasRunningRef.current = running;
				if (running) {
					setSettled(false);
					flourishedRef.current = false;
					return;
				}
				if (flourishedRef.current) return;
				if (turnStreaming && !wasRunning) return;
				if (!liveRef.current) return;
				const el = inlineRef.current;
				if (el === null || expanded || el.ownerDocument.visibilityState === "hidden") {
					flourishedRef.current = true;
					setSettled(true);
					return;
				}
				const HOLD_MS = 500;
				/**
				* A frame gap this long means the page stopped painting mid-flourish. The
				* reader missed it, so it finishes at once instead of replaying a slow
				* slide from wherever the box was left.
				*/
				const STALE_FRAME_GAP_MS = 500;
				/**
				* Constant rewind speed. A fixed duration made a long chain rewind far
				* faster than a short one; holding the speed and letting only the duration
				* scale keeps the motion identical whatever the chain's length.
				*/
				const UP_PX_PER_SEC = 1600;
				let phase = "drain";
				let lastTs = performance.now();
				let holdUntil = 0;
				let upStart = 0;
				let upFrom = 0;
				let upMs = 0;
				let frame = 0;
				const step = (ts) => {
					const dt = ts - lastTs;
					lastTs = ts;
					if (dt > STALE_FRAME_GAP_MS) {
						el.scrollTop = 0;
						flourishedRef.current = true;
						setSettled(true);
						return;
					}
					const bottom = Math.max(0, el.scrollHeight - el.clientHeight);
					if (phase === "drain") {
						el.scrollTop = beltStep(el, beltRef.current, dt, true);
						if (el.scrollTop >= bottom - .5) {
							el.scrollTop = bottom;
							phase = "hold";
							holdUntil = ts + HOLD_MS;
						}
					} else if (phase === "hold") {
						el.scrollTop = bottom;
						if (ts >= holdUntil) {
							phase = "up";
							upFrom = bottom;
							upStart = ts;
							upMs = bottom === 0 ? 0 : Math.max(90, bottom / UP_PX_PER_SEC * 1e3);
						}
					} else {
						const progress = upMs === 0 ? 1 : (ts - upStart) / upMs;
						if (progress >= 1) {
							el.scrollTop = 0;
							flourishedRef.current = true;
							setSettled(true);
							return;
						}
						el.scrollTop = upFrom * (1 - progress);
					}
					frame = requestAnimationFrame(step);
				};
				frame = requestAnimationFrame(step);
				return () => {
					cancelAnimationFrame(frame);
				};
			}, [
				running,
				turnStreaming,
				expanded
			]);
			/**
			* Toggle the body while pinning this row's viewport position. Opening it adds
			* up to eighteen lines above the composer; without the correction the
			* conversation scroller - and this plugin's own follower - react to that jump
			* and the view lands somewhere else entirely. Compensation runs for the
			* length of the grid-track transition and then stops.
			*/
			const toggleExpanded = (0, react.useCallback)(() => {
				userScrolledRef.current = false;
				const anchor = commitAnchorRef.current;
				const scroller = anchor === null ? null : scrollParentOf(anchor);
				const before = anchor?.getBoundingClientRect().top ?? 0;
				setExpanded((value) => !value);
				if (anchor === null || scroller === null) return;
				const until = performance.now() + 340;
				const pin = () => {
					const delta = anchor.getBoundingClientRect().top - before;
					if (Math.abs(delta) > .5) scroller.scrollTop += delta;
					if (performance.now() < until) requestAnimationFrame(pin);
				};
				requestAnimationFrame(pin);
			}, []);
			const translateLabel = (key) => t(key);
			const translateTrailing = translation !== void 0 && translationControl.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				translationControl.active && translationControl.pending && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ReasoningAssistantNodeView_module_css_default.thinkTranslateStatus,
					children: translateLabel("message.think.translating")
				}),
				translationControl.failed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ReasoningAssistantNodeView_module_css_default.thinkTranslateStatus,
					children: translateLabel("message.think.translateFailed")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: ReasoningAssistantNodeView_module_css_default.thinkTranslateButton,
					onClick: (event) => {
						event.stopPropagation();
						translationControl.retry();
					},
					onKeyDown: (event) => {
						event.stopPropagation();
					},
					children: translateLabel("message.think.translateRetry")
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: ReasoningAssistantNodeView_module_css_default.thinkTranslateButton,
					"aria-pressed": translationControl.active,
					title: translationLabel,
					onClick: (event) => {
						event.stopPropagation();
						translationControl.toggle();
					},
					onKeyDown: (event) => {
						event.stopPropagation();
					},
					children: translateLabel(translationControl.active ? "message.think.original" : "message.think.translate")
				})
			] }) : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ReasoningAssistantNodeView_module_css_default.follow,
				ref: commitAnchorRef,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ReasoningAssistantNodeView_module_css_default.think,
					"data-variant": "think",
					"data-state": running ? "running" : "ok",
					children: [running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ReasoningAssistantNodeView_module_css_default.visuallyHidden,
						children: t("row.running")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnimatedDisclosure, {
						rowClassName: expanded ? ReasoningAssistantNodeView_module_css_default.thinkRow : `${ReasoningAssistantNodeView_module_css_default.thinkRow} ${ReasoningAssistantNodeView_module_css_default.thinkRowInline}`,
						leadingClassName: ReasoningAssistantNodeView_module_css_default.thinkLeading,
						titleClassName: ReasoningAssistantNodeView_module_css_default.thinkTitle,
						chevronClassName: ReasoningAssistantNodeView_module_css_default.thinkChevron,
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconThink, { size: 14 }),
						title: t("message.think"),
						open: expanded,
						onToggle: toggleExpanded,
						trailing: translateTrailing,
						collapsedContent: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ReasoningAssistantNodeView_module_css_default.thinkSeparator,
							"aria-hidden": true
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: inlineRef,
							className: ReasoningAssistantNodeView_module_css_default.thinkInline,
							"data-settled": settled ? "" : void 0,
							"data-follow-end": running || void 0,
							children: shown
						})] }),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ReasoningAssistantNodeView_module_css_default.thinkExpanded,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								ref: fadeRootRef,
								className: ReasoningAssistantNodeView_module_css_default.thinkBody,
								children: shown
							})
						})
					})]
				})
			});
		}
		/**
		* Assistant node renderer for the reasoning-box overlay.
		*
		* The body is rendered directly by the Harness primitives: text through
		* `MarkdownText`, images through `ImageGallery`, unknown payloads through
		* `JsonBlock`. This fork removed the body reveal/follow engine, so nothing
		* here paces or scrolls the answer; only the reasoning box still owns its
		* own inline preview, character reveal, fade and settle flourish.
		*/
		const ReasoningAssistantNodeView = (0, react.memo)(function ReasoningAssistantNodeView({ thinkAutoExpand = true, node, groupPart, useTurnData, openFile, loadImage, fileMentions, turnProcess, sessionId, translation, translationLabel, autoTranslate, t }) {
			const data = node.data;
			const streaming = data.status === "running";
			const blocks = groupPart === "reasoning" ? data.blocks.filter((block) => block.kind === "reasoning") : groupPart === "response" ? data.blocks.filter((block) => block.kind !== "reasoning") : data.blocks;
			const reasoningHidden = turnProcess !== void 0 && turnProcess.foldable && turnProcess.spec.answerStep === data.step && turnProcess.spec.inlineReasoning && !turnProcess.open;
			const revealProcess = (0, react.useCallback)(() => {
				turnProcess?.setOpen(true);
			}, [turnProcess]);
			const turn = node.location.kind === "turn" || node.location.kind === "step" ? node.location.turn : void 0;
			const tail = useTurnData("turn-tail");
			const owner = (0, react.useMemo)(() => {
				if (turn?.status !== "closed" || data.finalNode === void 0) return void 0;
				if (tail?.closing?.finalNode.seq !== data.finalNode.seq) return void 0;
				return {
					turn,
					seq: data.finalNode.seq,
					openFile
				};
			}, [
				data.finalNode,
				openFile,
				tail,
				turn
			]);
			const mentions = (0, react.useMemo)(() => owner === void 0 ? void 0 : fileMentions(owner), [fileMentions, owner]);
			const markdownLabels = (0, react.useMemo)(() => ({
				code: {
					copyLabel: t("copy"),
					copiedLabel: t("copied")
				},
				footnotes: t("markdown.footnotes")
			}), [t]);
			const imageLoader = loadImage ?? (async () => {
				throw new Error(t("image.serviceUnavailable"));
			});
			if (!(streaming || data.status === "interrupted" || blocks.some((block) => block.kind !== "tool-call"))) return null;
			const stepTailIsReasoning = data.blocks[data.blocks.length - 1]?.kind === "reasoning";
			const rendered = [];
			const last = blocks.length - 1;
			for (let index = 0; index < blocks.length; index += 1) {
				const block = blocks[index];
				if (block === void 0) continue;
				switch (block.kind) {
					case "text":
						if (!streaming && block.text.trim() === "") break;
						rendered.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
							text: block.text,
							streaming,
							labels: markdownLabels,
							fileMentions: mentions
						}, index));
						break;
					case "reasoning":
						rendered.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FoldableReasoning, {
							hidden: reasoningHidden,
							reveal: revealProcess,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnimatedReasoning, {
								text: block.text,
								running: streaming && index === last && (groupPart !== "reasoning" || stepTailIsReasoning),
								turnStreaming: streaming,
								thinkAutoExpand,
								sessionId,
								translation,
								translationLabel,
								autoTranslate: autoTranslate === true,
								t
							})
						}, index));
						break;
					case "image": {
						const start = index;
						const group = [block];
						while (index + 1 < blocks.length) {
							const next = blocks[index + 1];
							if (next === void 0 || next.kind !== "image") break;
							group.push(next);
							index += 1;
						}
						rendered.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_attachment.ImageGallery, {
							images: group,
							load: imageLoader,
							align: "start",
							labels: imageLabels(t)
						}, start));
						break;
					}
					case "tool-call": break;
					case "other": rendered.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.JsonBlock, {
						label: t("message.unknownBlock"),
						payload: block.block,
						truncatedLabel: (total) => t("json.truncated", { total })
					}, index));
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ReasoningAssistantNodeView_module_css_default.root,
				"data-streaming": streaming || void 0,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ReasoningAssistantNodeView_module_css_default.body,
					children: [rendered, data.status === "interrupted" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ReasoningAssistantNodeView_module_css_default.stopped,
						children: t("message.stopped")
					})]
				})
			});
		});
		//#endregion
		//#region \0dsh-css:/Users/wench/Documents/DS Harness/dsh-think-box-plugin/src/client/TranslationModelPicker.module.css.mjs
		const css$1 = ".hBZyeG_root{flex-direction:column;gap:4px;display:flex}.hBZyeG_trigger{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);width:100%;min-height:28px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;border-radius:8px;align-items:center;gap:8px;padding:4px 8px;font-size:13px;line-height:1.5;display:flex}.hBZyeG_trigger:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed)}.hBZyeG_trigger:disabled{opacity:.5;cursor:default}.hBZyeG_label{color:var(--dsw-alias-label-secondary);flex:none}.hBZyeG_value{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.hBZyeG_chevron{color:var(--dsw-alias-label-dimmed);flex:none;transition:transform .12s}.hBZyeG_chevronOpen{transform:rotate(180deg)}.hBZyeG_card{z-index:1200;box-sizing:border-box;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-3);box-shadow:var(--dsw-elevation-prominent);border:0;flex-direction:column;max-height:360px;padding:4px;display:flex;position:fixed;overflow:hidden}.hBZyeG_pane{flex-direction:column;min-height:0;display:flex}.hBZyeG_status{color:var(--dsw-alias-label-secondary);margin:6px 7px;font-size:12px;line-height:18px}.hBZyeG_failure{align-items:center;gap:8px;padding:4px 7px;display:flex}.hBZyeG_retry{border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border:none;margin-left:auto;padding:4px 8px;font-size:12px}.hBZyeG_retry:hover{background:var(--dsw-alias-interactive-bg-hover)}.hBZyeG_missing{color:var(--dsw-alias-label-tertiary);margin:4px 7px 6px;font-size:12px;line-height:18px}.hBZyeG_row{border-radius:var(--dsw-radius-md);width:100%;min-height:34px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:6px;padding:5px 7px;font-size:14px;display:flex}.hBZyeG_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.hBZyeG_rowLabel{color:var(--dsw-alias-label-primary);flex:none}.hBZyeG_rowValue{text-overflow:ellipsis;white-space:nowrap;text-align:right;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;overflow:hidden}.hBZyeG_rowChevron{color:var(--dsw-alias-label-tertiary);flex:none}.hBZyeG_searchRow{flex-shrink:0;margin:2px 0 3px;position:relative}.hBZyeG_searchInput{border-radius:var(--dsw-radius-md);background:0 0;border:0 solid #0000;width:100%;height:auto;padding:5px 7px;display:flex}.hBZyeG_searchInput:focus-within{border-color:#0000}.hBZyeG_searchInput input{padding:0;font-size:12px;line-height:normal}.hBZyeG_searchInput input::placeholder{color:var(--dsw-alias-label-caption)}.hBZyeG_groups{flex-direction:column;min-height:0;display:flex;overflow:hidden auto}.hBZyeG_group{flex-direction:column;display:flex}.hBZyeG_groupHead{z-index:1;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-caption);padding:4px 7px;font-size:12px;font-weight:600;line-height:18px;position:sticky;top:0}.hBZyeG_modelRow{border-radius:var(--dsw-radius-md);width:100%;min-height:34px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:6px;padding:5px 7px;font-size:14px;display:flex}.hBZyeG_modelRow:hover,.hBZyeG_modelRowSelected{background:var(--dsw-alias-interactive-bg-hover)}.hBZyeG_modelText{flex:1;min-width:0;display:flex}.hBZyeG_modelName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.hBZyeG_check{color:var(--dsw-alias-label-primary);flex:0 0 14px;place-items:center;display:grid}.hBZyeG_check svg{width:14px;height:14px}.hBZyeG_bundleNotice{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:1.5}";
		const tagId$1 = "@local/dsh-think-box/TranslationModelPicker.module.css";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@local/dsh-think-box";
				tag.dataset.pluginCss = tagId$1;
				document.head.appendChild(tag);
			}
			tag.textContent = css$1;
		}
		var TranslationModelPicker_module_css_default = {
			"label": "hBZyeG_label",
			"group": "hBZyeG_group",
			"retry": "hBZyeG_retry",
			"rowChevron": "hBZyeG_rowChevron",
			"modelRow": "hBZyeG_modelRow",
			"modelText": "hBZyeG_modelText",
			"modelName": "hBZyeG_modelName",
			"groups": "hBZyeG_groups",
			"check": "hBZyeG_check",
			"bundleNotice": "hBZyeG_bundleNotice",
			"value": "hBZyeG_value",
			"card": "hBZyeG_card",
			"rowValue": "hBZyeG_rowValue",
			"trigger": "hBZyeG_trigger",
			"row": "hBZyeG_row",
			"missing": "hBZyeG_missing",
			"rowLabel": "hBZyeG_rowLabel",
			"chevron": "hBZyeG_chevron",
			"root": "hBZyeG_root",
			"chevronOpen": "hBZyeG_chevronOpen",
			"pane": "hBZyeG_pane",
			"searchInput": "hBZyeG_searchInput",
			"searchRow": "hBZyeG_searchRow",
			"groupHead": "hBZyeG_groupHead",
			"modelRowSelected": "hBZyeG_modelRowSelected",
			"failure": "hBZyeG_failure",
			"status": "hBZyeG_status"
		};
		//#endregion
		//#region src/client/TranslationModelPicker.tsx
		/**
		* Provider/model/reasoning picker for the translation channel.
		*
		* The Plugins page renders the card inside its own scroll container, so the
		* floating panel is portaled to `document.body` and positioned with `fixed`
		* coordinates measured from the trigger. It never nests an overflow-clipped
		* menu inside the form.
		*
		* Data comes from the Host catalog endpoint; selections are only staged with
		* `editTranslation` and land on disk through the channel's Save button.
		*/
		/** Only a text model is offered for a text translation task. */
		function isTextModel(model) {
			return model.inputModalities === void 0 || model.inputModalities.includes("text");
		}
		/** Current-model lookup across the flattened catalog. */
		function locate(catalog, provider, model) {
			if (catalog === void 0) return void 0;
			for (const row of catalog.providers) {
				if (row.id !== provider) continue;
				const found = row.models.find((item) => item.id === model && isTextModel(item));
				if (found !== void 0) return {
					provider: row,
					model: found
				};
			}
		}
		/** Read the display names for a configuration, falling back to raw ids. */
		function summaryOf(catalog, provider, model, reasoningEffort) {
			const current = locate(catalog, provider, model);
			const effortName = current === void 0 ? reasoningEffort : current.model.reasoning === void 0 ? "" : reasoningEffort === "" ? "" : current.model.reasoning.efforts.find((effort) => effort.id === reasoningEffort)?.name ?? reasoningEffort;
			const parts = [
				current?.provider.name ?? provider,
				current?.model.name ?? model,
				effortName
			].filter((part) => part !== "");
			return {
				provider: current?.provider.name ?? provider,
				model: current?.model.name ?? model,
				effort: effortName,
				text: parts.join(" · ")
			};
		}
		/**
		* Render the collapsed model-route row and its floating catalog card.
		* @param props - staged configuration plus the lazy catalog reader.
		* @returns the trigger, or the bundle notice when the official backend is active.
		*/
		function TranslationModelPicker({ t, provider, model, reasoningEffort, backend, disabled, loadCatalog, onSelect }) {
			const [catalog, setCatalog] = (0, react.useState)(void 0);
			const [status, setStatus] = (0, react.useState)("loading");
			const [attempt, setAttempt] = (0, react.useState)(0);
			const [open, setOpen] = (0, react.useState)(false);
			const [pane, setPane] = (0, react.useState)("root");
			const [query, setQuery] = (0, react.useState)("");
			const [rect, setRect] = (0, react.useState)(void 0);
			const triggerRef = (0, react.useRef)(null);
			const cardRef = (0, react.useRef)(null);
			const loadCatalogRef = (0, react.useRef)(loadCatalog);
			loadCatalogRef.current = loadCatalog;
			const id = (0, react.useId)();
			const load = (0, react.useCallback)((signal) => {
				setStatus("loading");
				loadCatalogRef.current(signal).then((next) => {
					if (signal.aborted) return;
					setCatalog(next);
					setStatus("ready");
				}, () => {
					if (signal.aborted) return;
					setStatus("error");
				});
			}, []);
			(0, react.useEffect)(() => {
				if (backend !== "llm") return;
				const controller = new AbortController();
				load(controller.signal);
				return () => {
					controller.abort();
				};
			}, [
				backend,
				load,
				attempt
			]);
			const current = locate(catalog, provider, model);
			const summary = summaryOf(catalog, provider, model, reasoningEffort);
			const efforts = current?.model.reasoning?.efforts ?? [];
			const effortChoices = (0, react.useMemo)(() => current?.model.reasoning === void 0 ? [] : [...current.model.reasoning.defaultEffort === void 0 ? [{
				id: "",
				name: t("translationEffortDefault")
			}] : [], ...current.model.reasoning.efforts.map((effort) => ({
				id: effort.id,
				name: effort.name
			}))], [current, t]);
			const filteredProviders = (0, react.useMemo)(() => {
				const needle = query.trim().toLowerCase();
				return (catalog?.providers ?? []).map((providerRow) => ({
					...providerRow,
					models: providerRow.models.filter((modelRow) => isTextModel(modelRow) && (needle === "" || modelRow.name.toLowerCase().includes(needle) || modelRow.id.toLowerCase().includes(needle) || providerRow.name.toLowerCase().includes(needle)))
				})).filter((providerRow) => providerRow.models.length > 0);
			}, [catalog, query]);
			const modelCount = (0, react.useMemo)(() => (catalog?.providers ?? []).reduce((count, providerRow) => count + providerRow.models.filter(isTextModel).length, 0), [catalog]);
			const measure = (0, react.useCallback)(() => {
				const trigger = triggerRef.current;
				if (trigger === null) return;
				const bounds = trigger.getBoundingClientRect();
				const availableWidth = Math.max(280, window.innerWidth - 16);
				const width = Math.min(Math.max(bounds.width, 360), Math.min(420, availableWidth));
				const left = Math.min(Math.max(8, bounds.left), Math.max(8, window.innerWidth - width - 8));
				const gap = 6;
				const below = window.innerHeight - bounds.bottom - 12;
				const above = bounds.top - 12;
				const wanted = 360;
				if (below >= 180) {
					setRect({
						left,
						top: bounds.bottom + gap,
						width,
						height: Math.min(wanted, below)
					});
					return;
				}
				const height = Math.min(wanted, Math.max(0, above));
				setRect({
					left,
					top: bounds.top - gap - height,
					width,
					height
				});
			}, []);
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				measure();
				const frame = requestAnimationFrame(() => {
					measure();
				});
				const onScroll = () => {
					measure();
				};
				window.addEventListener("scroll", onScroll, true);
				window.addEventListener("resize", onScroll);
				return () => {
					cancelAnimationFrame(frame);
					window.removeEventListener("scroll", onScroll, true);
					window.removeEventListener("resize", onScroll);
				};
			}, [open, measure]);
			const close = (0, react.useCallback)(() => {
				setOpen(false);
				setPane("root");
				setQuery("");
				triggerRef.current?.focus();
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				const outside = (event) => {
					const target = event.target;
					if (target === null) return;
					if (cardRef.current?.contains(target) === true) return;
					if (triggerRef.current?.contains(target) === true) return;
					setOpen(false);
				};
				document.addEventListener("pointerdown", outside);
				return () => {
					document.removeEventListener("pointerdown", outside);
				};
			}, [open]);
			const onTriggerKeyDown = (event) => {
				if (event.key === "Escape" && open) close();
			};
			const onCardKeyDown = (event) => {
				if (event.key !== "Escape") return;
				event.stopPropagation();
				if (pane !== "root") {
					setPane("root");
					setQuery("");
					return;
				}
				close();
			};
			const chooseModel = (providerRow, modelRow) => {
				const reasoning = modelRow.reasoning;
				onSelect({
					provider: providerRow.id,
					model: modelRow.id,
					reasoningEffort: reasoning?.defaultEffort ?? reasoning?.efforts[0]?.id ?? ""
				});
				setPane("root");
			};
			const chooseEffort = (effort) => {
				if (current === void 0) return;
				onSelect({
					provider: current.provider.id,
					model: current.model.id,
					reasoningEffort: effort
				});
				close();
			};
			if (backend !== "llm") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: TranslationModelPicker_module_css_default.bundleNotice,
				children: t("translationBundleDecides")
			});
			const card = open && rect !== void 0 ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: cardRef,
				id,
				className: TranslationModelPicker_module_css_default.card,
				role: "dialog",
				"aria-label": t("translationRoute"),
				style: {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					maxHeight: rect.height
				},
				onKeyDown: onCardKeyDown,
				children: [
					pane === "root" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TranslationModelPicker_module_css_default.pane,
						children: [
							status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: TranslationModelPicker_module_css_default.status,
								children: t("translationCatalogLoading")
							}) : null,
							status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TranslationModelPicker_module_css_default.failure,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: TranslationModelPicker_module_css_default.status,
									role: "status",
									children: t("translationCatalogFailed")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: TranslationModelPicker_module_css_default.retry,
									onClick: () => {
										setAttempt((value) => value + 1);
									},
									children: t("retry")
								})]
							}) : null,
							status === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								current === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: TranslationModelPicker_module_css_default.missing,
									children: t("translationRouteMissing")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: TranslationModelPicker_module_css_default.row,
									onClick: () => {
										setPane("model");
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslationModelPicker_module_css_default.rowLabel,
											children: t("translationModel")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslationModelPicker_module_css_default.rowValue,
											children: summary.model
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronRight, { className: TranslationModelPicker_module_css_default.rowChevron })
									]
								}),
								current !== void 0 && efforts.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: TranslationModelPicker_module_css_default.row,
									onClick: () => {
										setPane("effort");
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslationModelPicker_module_css_default.rowLabel,
											children: t("translationEffort")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslationModelPicker_module_css_default.rowValue,
											children: reasoningEffort === "" ? t("translationEffortDefault") : summary.effort === "" ? reasoningEffort : summary.effort
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronRight, { className: TranslationModelPicker_module_css_default.rowChevron })
									]
								}) : null
							] }) : null
						]
					}) : null,
					pane === "model" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TranslationModelPicker_module_css_default.pane,
						children: [modelCount > 4 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: TranslationModelPicker_module_css_default.searchRow,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: TranslationModelPicker_module_css_default.searchInput ?? "",
								placeholder: `${t("translationSearchModels")}…`,
								value: query,
								onChange: (event) => {
									setQuery(event.target.value);
								}
							})
						}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: TranslationModelPicker_module_css_default.groups,
							children: filteredProviders.map((providerRow) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TranslationModelPicker_module_css_default.group,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: TranslationModelPicker_module_css_default.groupHead,
									children: providerRow.name
								}), providerRow.models.map((modelRow) => {
									const selected = providerRow.id === provider && modelRow.id === model;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: selected ? `${TranslationModelPicker_module_css_default.modelRow} ${TranslationModelPicker_module_css_default.modelRowSelected}` : TranslationModelPicker_module_css_default.modelRow,
										onClick: () => {
											chooseModel(providerRow, modelRow);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: TranslationModelPicker_module_css_default.modelText,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: TranslationModelPicker_module_css_default.modelName,
												children: modelRow.name
											})
										}), selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, { className: TranslationModelPicker_module_css_default.check }) : null]
									}, `${providerRow.id}/${modelRow.id}`);
								})]
							}, providerRow.id))
						})]
					}) : null,
					pane === "effort" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TranslationModelPicker_module_css_default.pane,
						children: effortChoices.map((choice) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: choice.id === reasoningEffort ? `${TranslationModelPicker_module_css_default.modelRow} ${TranslationModelPicker_module_css_default.modelRowSelected}` : TranslationModelPicker_module_css_default.modelRow,
							onClick: () => {
								chooseEffort(choice.id);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TranslationModelPicker_module_css_default.modelName,
								children: choice.name
							}), choice.id === reasoningEffort ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, { className: TranslationModelPicker_module_css_default.check }) : null]
						}, choice.id === "" ? "default" : choice.id))
					}) : null
				]
			}), document.body) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TranslationModelPicker_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: TranslationModelPicker_module_css_default.trigger,
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					"aria-controls": open ? id : void 0,
					disabled,
					onClick: () => {
						if (open) {
							close();
							return;
						}
						measure();
						requestAnimationFrame(() => {
							measure();
						});
						setOpen(true);
						setPane("root");
						setQuery("");
					},
					onKeyDown: onTriggerKeyDown,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TranslationModelPicker_module_css_default.label,
							children: t("translationRoute")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TranslationModelPicker_module_css_default.value,
							children: summary.text
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronDown, { className: open ? `${TranslationModelPicker_module_css_default.chevron} ${TranslationModelPicker_module_css_default.chevronOpen}` : TranslationModelPicker_module_css_default.chevron })
					]
				}), card]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/wench/Documents/DS Harness/dsh-think-box-plugin/src/client/ThinkBoxCard.module.css.mjs
		const css = ".nLV5xG_pluginPageList{flex-direction:column;gap:10px;max-width:760px;margin:0;padding:0;list-style:none;display:flex}.nLV5xG_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;flex-direction:column;list-style:none;transition:border-color .16s,background .16s;display:flex}.nLV5xG_card:hover{border-color:var(--dsw-alias-label-dimmed)}.nLV5xG_cardOpen{border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-bg-layer-2)}.nLV5xG_header{appearance:none;cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.nLV5xG_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.nLV5xG_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.nLV5xG_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.nLV5xG_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.nLV5xG_pending{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.nLV5xG_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.nLV5xG_chevronOpen{transform:rotate(180deg)}.nLV5xG_body{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;margin:0 16px;padding-bottom:8px;display:flex}.nLV5xG_readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.nLV5xG_field{flex-direction:column;gap:6px;padding:12px 0;display:flex}.nLV5xG_field+.nLV5xG_field{border-top:1px solid var(--dsw-alias-border-l2)}.nLV5xG_fieldDisabled{opacity:.5}.nLV5xG_fieldHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.nLV5xG_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.nLV5xG_toggle{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}.nLV5xG_toggle:disabled{cursor:default}.nLV5xG_toggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.nLV5xG_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.nLV5xG_failure{justify-content:space-between;align-items:center;gap:12px;padding:12px 0;display:flex}.nLV5xG_footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.nLV5xG_failed{min-width:0;color:var(--dsw-alias-label-error);flex:1;margin:0;font-size:12px;line-height:1.5}.nLV5xG_save,.nLV5xG_discard{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.nLV5xG_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.nLV5xG_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.nLV5xG_discard:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary)}.nLV5xG_discard:disabled,.nLV5xG_save:disabled{opacity:.4;cursor:default}.nLV5xG_discard:focus-visible,.nLV5xG_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.nLV5xG_translation{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;margin-top:4px;padding-top:12px;display:flex}.nLV5xG_translationHead{align-items:center;gap:8px;display:flex}.nLV5xG_textInput,.nLV5xG_selectInput,.nLV5xG_numberInput{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);height:28px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:6px;flex:none;padding:0 8px;font-size:12px}.nLV5xG_textInput{width:15rem;max-width:60%}.nLV5xG_selectInput{cursor:pointer;width:auto;min-width:12rem}.nLV5xG_numberInput{width:7rem}.nLV5xG_textInput:focus-visible,.nLV5xG_selectInput:focus-visible,.nLV5xG_numberInput:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.nLV5xG_translationActions{justify-content:flex-end;align-items:center;gap:8px;padding-top:4px;display:flex}.nLV5xG_translationActions .nLV5xG_failed{margin:0 auto 0 0}";
		const tagId = "@local/dsh-think-box/ThinkBoxCard.module.css";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@local/dsh-think-box";
				tag.dataset.pluginCss = tagId;
				document.head.appendChild(tag);
			}
			tag.textContent = css;
		}
		var ThinkBoxCard_module_css_default = {
			"translationHead": "nLV5xG_translationHead",
			"toggle": "nLV5xG_toggle",
			"body": "nLV5xG_body",
			"header": "nLV5xG_header",
			"cardOpen": "nLV5xG_cardOpen",
			"field": "nLV5xG_field",
			"failure": "nLV5xG_failure",
			"textInput": "nLV5xG_textInput",
			"headText": "nLV5xG_headText",
			"hint": "nLV5xG_hint",
			"fieldDisabled": "nLV5xG_fieldDisabled",
			"description": "nLV5xG_description",
			"footer": "nLV5xG_footer",
			"failed": "nLV5xG_failed",
			"pluginPageList": "nLV5xG_pluginPageList",
			"readOnly": "nLV5xG_readOnly",
			"discard": "nLV5xG_discard",
			"chevronOpen": "nLV5xG_chevronOpen",
			"label": "nLV5xG_label",
			"translation": "nLV5xG_translation",
			"selectInput": "nLV5xG_selectInput",
			"fieldHead": "nLV5xG_fieldHead",
			"card": "nLV5xG_card",
			"name": "nLV5xG_name",
			"pending": "nLV5xG_pending",
			"chevron": "nLV5xG_chevron",
			"numberInput": "nLV5xG_numberInput",
			"translationActions": "nLV5xG_translationActions",
			"save": "nLV5xG_save"
		};
		//#endregion
		//#region src/client/ThinkBoxCard.tsx
		/**
		* The think-box plugin configuration card. Preferences are staged until
		* the user saves: the total switch and the inline reasoning box's auto-follow.
		* Translation settings live in their own channel below them.
		*/
		/** Render the think-box card independently of the core settings namespace allowlist. */
		function ThinkBoxCard(props) {
			const { t } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const state = props.useThinkBoxCard((snapshot) => snapshot);
			const translation = props.useTranslationCard((snapshot) => snapshot);
			const blocked = !state.dirty || state.saving || state.status !== "ready";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: open ? `${ThinkBoxCard_module_css_default.card} ${ThinkBoxCard_module_css_default.cardOpen}` : ThinkBoxCard_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ThinkBoxCard_module_css_default.header,
					"aria-expanded": open,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ThinkBoxCard_module_css_default.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThinkBoxCard_module_css_default.name,
								children: t("title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThinkBoxCard_module_css_default.description,
								children: t("description")
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ThinkBoxCard_module_css_default.pending,
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevronDown, { className: open ? `${ThinkBoxCard_module_css_default.chevron} ${ThinkBoxCard_module_css_default.chevronOpen}` : ThinkBoxCard_module_css_default.chevron })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ThinkBoxCard_module_css_default.body,
					children: [
						state.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ThinkBoxCard_module_css_default.readOnly,
							role: "status",
							children: t("loading")
						}) : null,
						state.status === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ThinkBoxCard_module_css_default.failure,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ThinkBoxCard_module_css_default.readOnly,
								role: "status",
								children: t("unavailable")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ThinkBoxCard_module_css_default.discard,
								onClick: props.reload,
								children: t("retry")
							})]
						}) : null,
						state.status === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ThinkBoxCard_module_css_default.readOnly,
								role: "status",
								children: t("readOnly")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ThinkBoxCard_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: ThinkBoxCard_module_css_default.fieldHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ThinkBoxCard_module_css_default.label,
										children: t("enabled")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										className: ThinkBoxCard_module_css_default.toggle,
										checked: state.enabled,
										disabled: !state.writable || state.saving,
										onChange: (event) => {
											props.edit({ enabled: event.target.checked });
										}
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThinkBoxCard_module_css_default.hint,
									children: t("enabledHint")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: state.enabled ? ThinkBoxCard_module_css_default.field : `${ThinkBoxCard_module_css_default.field} ${ThinkBoxCard_module_css_default.fieldDisabled}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: ThinkBoxCard_module_css_default.fieldHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ThinkBoxCard_module_css_default.label,
										children: t("thinkAutoExpand")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										className: ThinkBoxCard_module_css_default.toggle,
										checked: state.thinkAutoExpand,
										disabled: !state.writable || state.saving || !state.enabled,
										onChange: (event) => {
											props.edit({ thinkAutoExpand: event.target.checked });
										}
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThinkBoxCard_module_css_default.hint,
									children: t("thinkAutoExpandHint")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ThinkBoxCard_module_css_default.footer,
								children: [
									state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: ThinkBoxCard_module_css_default.failed,
										role: "status",
										children: t("saveFailed")
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ThinkBoxCard_module_css_default.discard,
										disabled: !state.dirty || state.saving,
										onClick: props.discard,
										children: t("discard")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ThinkBoxCard_module_css_default.save,
										disabled: blocked,
										onClick: props.save,
										children: t(state.saving ? "saving" : "save")
									})
								]
							})
						] }) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TranslationChannel, {
							t,
							translation,
							edit: props.editTranslation,
							save: props.saveTranslation,
							discard: props.discardTranslation,
							reload: props.reloadTranslation,
							loadCatalog: props.loadTranslationCatalog
						})
					]
				}) : null]
			});
		}
		/**
		* Translation-channel form. Kept independent of the durable think-box
		* settings so it works even where the deployment stores those read-only: it
		* writes the plugin-owned runtime store through its own loopback RPC.
		*/
		function TranslationChannel(props) {
			const { t, translation } = props;
			const settings = translation.settings;
			const disabled = translation.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ThinkBoxCard_module_css_default.translation,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ThinkBoxCard_module_css_default.translationHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ThinkBoxCard_module_css_default.label,
							children: t("translationTitle")
						}), translation.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ThinkBoxCard_module_css_default.pending,
							children: t("unsaved")
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ThinkBoxCard_module_css_default.hint,
						children: t("translationHint")
					}),
					translation.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ThinkBoxCard_module_css_default.readOnly,
						role: "status",
						children: t("translationLoading")
					}) : null,
					translation.status === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ThinkBoxCard_module_css_default.failure,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ThinkBoxCard_module_css_default.readOnly,
							role: "status",
							children: t("translationUnavailable")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ThinkBoxCard_module_css_default.discard,
							onClick: props.reload,
							children: t("retry")
						})]
					}) : null,
					translation.status === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ThinkBoxCard_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ThinkBoxCard_module_css_default.fieldHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThinkBoxCard_module_css_default.label,
									children: t("translationBackend")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: ThinkBoxCard_module_css_default.selectInput,
									value: settings.backend,
									disabled,
									onChange: (event) => {
										props.edit({ backend: event.target.value === "bundle" ? "bundle" : "llm" });
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "llm",
										children: t("translationBackendLlm")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "bundle",
										children: t("translationBackendBundle")
									})]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThinkBoxCard_module_css_default.hint,
								children: t("translationBackendHint")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ThinkBoxCard_module_css_default.field,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TranslationModelPicker, {
								t,
								provider: settings.provider,
								model: settings.model,
								reasoningEffort: settings.reasoningEffort,
								backend: settings.backend,
								disabled,
								loadCatalog: props.loadCatalog,
								onSelect: (patch) => {
									props.edit(patch);
								}
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ThinkBoxCard_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ThinkBoxCard_module_css_default.fieldHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThinkBoxCard_module_css_default.label,
									children: t("translationTargetLanguage")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ThinkBoxCard_module_css_default.textInput,
									type: "text",
									value: settings.targetLanguage,
									placeholder: "auto",
									disabled,
									onChange: (event) => {
										props.edit({ targetLanguage: event.target.value });
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThinkBoxCard_module_css_default.hint,
								children: t("translationTargetLanguageHint")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ThinkBoxCard_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ThinkBoxCard_module_css_default.fieldHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThinkBoxCard_module_css_default.label,
									children: t("translationMaxTextChars")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ThinkBoxCard_module_css_default.numberInput,
									type: "number",
									min: 64,
									step: 100,
									value: settings.maxTextChars,
									disabled,
									onChange: (event) => {
										const next = Number.parseInt(event.target.value, 10);
										if (Number.isFinite(next)) props.edit({ maxTextChars: next });
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThinkBoxCard_module_css_default.hint,
								children: t("translationMaxTextCharsHint")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ThinkBoxCard_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ThinkBoxCard_module_css_default.fieldHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThinkBoxCard_module_css_default.label,
									children: t("translationAutoTranslate")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									className: ThinkBoxCard_module_css_default.toggle,
									checked: settings.autoTranslate,
									disabled,
									onChange: (event) => {
										props.edit({ autoTranslate: event.target.checked });
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThinkBoxCard_module_css_default.hint,
								children: t("translationAutoTranslateHint")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ThinkBoxCard_module_css_default.translationActions,
							children: [
								translation.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: ThinkBoxCard_module_css_default.failed,
									role: "status",
									children: t("translationSaveFailed")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ThinkBoxCard_module_css_default.discard,
									disabled: !translation.dirty || disabled,
									onClick: props.discard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ThinkBoxCard_module_css_default.save,
									disabled: !translation.dirty || disabled,
									onClick: props.save,
									children: t(translation.saving ? "saving" : "save")
								})
							]
						})
					] }) : null
				]
			});
		}
		/**
		* `plugins.bundle.config` entry for Harness 0.2.1+.
		*
		* The sidebar Plugins page renders the entry inside its own section container
		* (`view: 'page'`), so the entry restores the plain list that the removed
		* settings page used to draw around registered cards. The card stays an
		* `<li>`; only its list chrome moves here.
		*/
		function ThinkBoxConfigPage(props) {
			if (props.view === "summary") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: ThinkBoxCard_module_css_default.pluginPageList,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThinkBoxCard, { ...props })
			});
		}
		//#endregion
		//#region src/client/clientStore.ts
		function fallbackSnapshotStore(init) {
			let state = init;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => state,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				update: (mutator) => {
					const draft = Object.create(Object.getPrototypeOf(state), Object.getOwnPropertyDescriptors(state));
					mutator(draft);
					state = draft;
					for (const listener of [...listeners]) listener(state);
				},
				set: (next) => {
					state = next;
					for (const listener of [...listeners]) listener(state);
				}
			};
		}
		/**
		* Runtime require: the module-loader factory scopes its own resolver over the
		* booting kernel's table; under Node (vitest) there is no global require, so
		* fall back to `createRequire`.
		*/
		function pickRequire() {
			if (typeof require === "function") try {
				return require;
			} catch {
				return null;
			}
			if (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") try {
				const { createRequire } = process.getBuiltinModule("node:module");
				return createRequire(process.cwd() + "/package.json");
			} catch {
				return null;
			}
			return null;
		}
		let clientStore;
		try {
			const req = pickRequire();
			if (req !== null) try {
				clientStore = req("@deepseek-ai/dsh-client-store");
			} catch {
				try {
					clientStore = req("@deepseek-ai/dsh-client-runtime/client");
				} catch {}
			}
		} catch {}
		const createSnapshotStore = clientStore?.createSnapshotStore ?? fallbackSnapshotStore;
		//#endregion
		//#region src/settings.ts
		/** Defaults shared by the Host schema and the client-side fallback. */
		const DEFAULT_THINK_BOX_SETTINGS = {
			enabled: true,
			thinkAutoExpand: true
		};
		//#endregion
		//#region src/config.ts
		/**
		* Shared plugin configuration contract.
		*
		* The Host half defines the Schemastery schema over this shape (defaults live
		* here so both halves stay symmetric); the client half falls back to the same
		* defaults when the Host boot-config bridge is absent (client-only
		* composition). Only the boot snapshot lives here: the live preferences are
		* volatile fields on the Host schema, and translation is a composition seed.
		*/
		/** Default translation settings: official bundle, free-route-ready switch. */
		const DEFAULT_TRANSLATION_CONFIG = {
			backend: "bundle",
			provider: "opencode-go",
			model: "deepseek-v4.1-flash",
			reasoningEffort: "low",
			targetLanguage: "auto",
			maxTextChars: 4e3,
			maxTokens: 8192,
			timeoutMs: 6e4,
			autoTranslate: true
		};
		/** Defaults shared by the Host schema and the client-side fallback. */
		const DEFAULT_THINK_BOX_CONFIG = {
			...DEFAULT_THINK_BOX_SETTINGS,
			translation: DEFAULT_TRANSLATION_CONFIG
		};
		/**
		* Window global the Host writes into the served index HTML. The browser boot
		* graph carries no per-entry config, so this inline script is the only
		* Host-to-client configuration channel for a composed web plugin.
		*/
		const THINK_BOX_BOOT_GLOBAL = "__DSH_THINK_BOX_CONFIG__";
		//#endregion
		//#region src/client/think-box-card-controller.ts
		/** Staged form state for the plugin-owned think-box settings RPC. */
		/** Bridges the plugin's protected Host interface onto a staged settings form. */
		var ThinkBoxCardController = class {
			api;
			translation;
			store = createSnapshotStore(this.projection());
			loaded;
			staged;
			saving = false;
			failed = false;
			loadGeneration = 0;
			loadStatus = "loading";
			translationStore;
			translationLoaded;
			translationStaged;
			translationSaving = false;
			translationFailed = false;
			translationStatus = "loading";
			translationGeneration = 0;
			/**
			* The injected face is stable for the controller's lifetime. The settings
			* slot calls `inject()` on every parent render; returning a fresh object each
			* time would feed new callback identities down the tree (and make the model
			* picker reload its catalog on any staged edit).
			*/
			face;
			constructor(api, translation) {
				this.api = api;
				this.translation = translation;
				this.translationStatus = translation === void 0 ? "unavailable" : "loading";
				this.translationLoaded = translation?.initial;
				this.translationStore = createSnapshotStore(this.translationProjection());
			}
			/** Begin the background reads after the card has been registered. */
			start() {
				this.load();
				this.loadTranslation();
			}
			/** Ignore a late response after the surrounding optional services unload. */
			stop() {
				this.loadGeneration += 1;
				this.translationGeneration += 1;
			}
			/** Current card snapshot, also consumed by the streaming preference cell. */
			getSnapshot() {
				return this.store.getSnapshot();
			}
			/** Subscribe to state changes. */
			subscribe(listener) {
				return this.store.subscribe(listener);
			}
			/** Build (once) the face consumed by the settings slot renderer. */
			inject() {
				if (this.face !== void 0) return this.face;
				const face = {
					hooks: {
						thinkBoxCard: this.store,
						translationCard: this.translationStore
					},
					edit: (patch) => {
						if (this.saving) return;
						this.staged = {
							...this.baseValues(),
							...patch.enabled === void 0 ? {} : { enabled: patch.enabled },
							...patch.thinkAutoExpand === void 0 ? {} : { thinkAutoExpand: patch.thinkAutoExpand }
						};
						this.failed = false;
						this.publish();
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged === void 0 && !this.failed) return;
						this.staged = void 0;
						this.failed = false;
						this.publish();
					},
					reload: () => {
						this.load();
					},
					editTranslation: (patch) => {
						if (this.translation === void 0 || this.translationSaving) return;
						const base = this.translationStaged ?? this.translationLoaded ?? this.translation.initial;
						this.translationStaged = {
							...base,
							...patch
						};
						this.translationFailed = false;
						this.publishTranslation();
					},
					saveTranslation: () => {
						this.saveTranslation();
					},
					discardTranslation: () => {
						if (this.translationStaged === void 0 && !this.translationFailed) return;
						this.translationStaged = void 0;
						this.translationFailed = false;
						this.publishTranslation();
					},
					reloadTranslation: () => {
						this.loadTranslation();
					},
					loadTranslationCatalog: async (signal) => {
						if (this.translation === void 0) throw new Error("translation settings are unavailable");
						return await this.translation.catalog(signal);
					}
				};
				this.face = face;
				return face;
			}
			projection() {
				return {
					status: this.loadStatus,
					writable: this.loaded?.writable ?? false,
					dirty: this.staged !== void 0,
					saving: this.saving,
					failed: this.failed,
					...this.baseValues()
				};
			}
			baseValues() {
				return this.staged ?? {
					enabled: this.loaded?.enabled ?? DEFAULT_THINK_BOX_SETTINGS.enabled,
					thinkAutoExpand: this.loaded?.thinkAutoExpand ?? DEFAULT_THINK_BOX_SETTINGS.thinkAutoExpand
				};
			}
			/** Complete settings projection consumed by the live SettingsCell bridge. */
			values() {
				return this.baseValues();
			}
			async load() {
				const generation = ++this.loadGeneration;
				this.loadStatus = "loading";
				this.loaded = void 0;
				this.publish();
				try {
					const view = await this.api.read();
					if (generation !== this.loadGeneration) return;
					this.loaded = view;
					this.loadStatus = "ready";
				} catch {
					if (generation !== this.loadGeneration) return;
					this.loaded = void 0;
					this.loadStatus = "unavailable";
				}
				this.publish();
			}
			async save() {
				if (this.staged === void 0 || this.saving || this.loaded?.writable !== true) return;
				const staged = this.staged;
				this.saving = true;
				this.failed = false;
				this.publish();
				try {
					this.loaded = await this.api.write(staged);
					this.staged = void 0;
				} catch {
					this.failed = true;
				}
				this.saving = false;
				this.publish();
			}
			translationProjection() {
				return {
					status: this.translationStatus,
					settings: this.translationStaged ?? this.translationLoaded ?? this.translation?.initial ?? DEFAULT_TRANSLATION_CONFIG,
					dirty: this.translationStaged !== void 0,
					saving: this.translationSaving,
					failed: this.translationFailed
				};
			}
			publishTranslation() {
				this.translationStore.set(this.translationProjection());
			}
			async loadTranslation() {
				const bridge = this.translation;
				if (bridge === void 0) return;
				const generation = ++this.translationGeneration;
				this.translationStatus = "loading";
				this.translationFailed = false;
				this.publishTranslation();
				try {
					const settings = await bridge.read();
					if (generation !== this.translationGeneration) return;
					this.translationLoaded = settings;
					this.translationStaged = void 0;
					this.translationStatus = "ready";
					bridge.apply(settings);
				} catch {
					if (generation !== this.translationGeneration) return;
					this.translationStatus = "unavailable";
				}
				this.publishTranslation();
			}
			async saveTranslation() {
				const bridge = this.translation;
				if (bridge === void 0 || this.translationStaged === void 0 || this.translationSaving) return;
				const staged = this.translationStaged;
				this.translationSaving = true;
				this.translationFailed = false;
				this.publishTranslation();
				try {
					const next = await bridge.write(staged);
					this.translationLoaded = next;
					this.translationStaged = void 0;
					this.translationStatus = "ready";
					bridge.apply(next);
				} catch {
					this.translationFailed = true;
				}
				this.translationSaving = false;
				this.publishTranslation();
			}
			publish() {
				this.store.set(this.projection());
			}
		};
		//#endregion
		//#region src/settings-api.ts
		/** Shared wire vocabulary for the plugin-owned settings RPC channel. */
		/** Dedicated, loopback-only RPC channel registered by the Host half. */
		const THINK_BOX_SETTINGS_RPC_CHANNEL = "/think-box";
		/** Endpoints accepted by {@link THINK_BOX_SETTINGS_RPC_CHANNEL}. */
		const THINK_BOX_SETTINGS_RPC = {
			read: "settings.read",
			write: "settings.write"
		};
		//#endregion
		//#region src/client/think-box-settings-api.ts
		function record(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
		}
		function settingsView(value) {
			const data = record(value);
			if (data === void 0 || typeof data.writable !== "boolean" || typeof data.enabled !== "boolean" || typeof data.thinkAutoExpand !== "boolean") throw new Error("dsh-think-box: malformed settings response");
			return {
				writable: data.writable,
				enabled: data.enabled,
				thinkAutoExpand: data.thinkAutoExpand
			};
		}
		function accepted(result) {
			if (!result.ok) throw new Error(result.error.message);
			return result.value;
		}
		/** Build the typed facade over the generic Connection RPC service. */
		function createThinkBoxSettingsApi(connection) {
			return {
				async read() {
					return settingsView(accepted(await connection.rpc.call(THINK_BOX_SETTINGS_RPC_CHANNEL, THINK_BOX_SETTINGS_RPC.read, {})));
				},
				async write(settings) {
					return settingsView(accepted(await connection.rpc.call(THINK_BOX_SETTINGS_RPC_CHANNEL, THINK_BOX_SETTINGS_RPC.write, {
						enabled: settings.enabled,
						thinkAutoExpand: settings.thinkAutoExpand
					})));
				}
			};
		}
		//#endregion
		//#region src/translation-protocol.ts
		/**
		* Wire contract between the Host translation bridge and the browser half.
		*
		* A dedicated loopback channel (same envelope carrier as the plugin's settings
		* channel) exposes the accepted route, the provider/model catalog, and one
		* endpoint to translate a single complete fragment through the Harness `llm`
		* service. Keeping the payloads here keeps both halves in lockstep.
		*/
		/** Absolute Connection RPC channel prefix for the reasoning translator. */
		const TRANSLATION_RPC_CHANNEL = "/think-box-translate";
		/** Endpoints accepted on {@link TRANSLATION_RPC_CHANNEL}. */
		const TRANSLATION_RPC = {
			settingsRead: "translation.settings.read",
			settingsWrite: "translation.settings.write",
			catalog: "translation.catalog",
			plan: "translation.plan",
			translate: "translation.translate"
		};
		//#endregion
		//#region src/client/host-translation.ts
		/** How long one accepted route plan is reused before re-reading. */
		const PLAN_TTL_MS = 5e3;
		/** Saved translations kept by this browser across blocks and re-toggles. */
		const MAX_CACHED_TRANSLATIONS = 512;
		/**
		* Build the browser face over the plugin's Host translation channel.
		* @param connection - Harness Connection handle for loopback RPC.
		* @param activeLocale - reads the current UI locale for `auto` destinations.
		* @returns a face the reasoning hook can drive.
		*/
		function createHostTranslationFace(connection, activeLocale) {
			const cache = /* @__PURE__ */ new Map();
			let accepted;
			const call = async (endpoint, payload, signal) => {
				return await connection.rpc.call(TRANSLATION_RPC_CHANNEL, endpoint, payload, signal);
			};
			return {
				async prepare(signal) {
					const now = Date.now();
					if (accepted !== void 0 && now - accepted.at < PLAN_TTL_MS) return accepted.plan;
					const result = await call(TRANSLATION_RPC.plan, {}, signal);
					if (!result.ok) throw new TranslationFailure(result.error.code ?? "translation/unavailable", result.error.message ?? "translation backend is unavailable");
					const value = result.value;
					const plan = {
						provider: value.provider,
						model: value.model,
						targetLanguage: value.targetLanguage === "auto" ? String(activeLocale()) : value.targetLanguage,
						maxTextChars: value.maxTextChars
					};
					accepted = {
						plan,
						at: now
					};
					return plan;
				},
				async translate(source, plan, sessionId, signal) {
					if (source.trim() === "") return "";
					const key = `${plan.provider}\u0000${plan.model ?? ""}\u0000${plan.targetLanguage}\u0000${source}`;
					const hit = cache.get(key);
					if (hit !== void 0) return hit;
					const result = await call(TRANSLATION_RPC.translate, {
						text: source,
						provider: plan.provider,
						model: plan.model,
						targetLanguage: plan.targetLanguage,
						...sessionId === void 0 ? {} : { sessionId }
					}, signal);
					if (!result.ok) throw new TranslationFailure(result.error.code ?? "translation/failed", result.error.message ?? "translation failed");
					if (typeof result.value !== "string") throw new TranslationFailure("translation/invalid-response", "translation backend returned a non-string result");
					if (cache.size >= MAX_CACHED_TRANSLATIONS) cache.clear();
					cache.set(key, result.value);
					return result.value;
				}
			};
		}
		//#endregion
		//#region src/client/translation-settings-api.ts
		/** Translation settings rejected or unavailable. */
		var TranslationSettingsFailure = class extends Error {
			code;
			constructor(code, message) {
				super(message);
				this.name = "TranslationSettingsFailure";
				this.code = code;
			}
		};
		function catalogProvider(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const row = value;
			if (typeof row.id !== "string" || typeof row.name !== "string" || !Array.isArray(row.models)) return void 0;
			const models = [];
			for (const model of row.models) {
				if (typeof model !== "object" || model === null || Array.isArray(model)) return void 0;
				const item = model;
				if (typeof item.id !== "string" || typeof item.name !== "string") return void 0;
				const base = {
					id: item.id,
					name: item.name,
					...typeof item.description === "string" ? { description: item.description } : {},
					...Array.isArray(item.inputModalities) ? { inputModalities: item.inputModalities.filter((value) => typeof value === "string") } : {}
				};
				const reasoning = item.reasoning;
				if (reasoning === void 0) {
					models.push(base);
					continue;
				}
				if (typeof reasoning !== "object" || reasoning === null || Array.isArray(reasoning)) return void 0;
				const meta = reasoning;
				if (!Array.isArray(meta.efforts)) return void 0;
				const efforts = [];
				for (const effort of meta.efforts) {
					if (typeof effort !== "object" || effort === null || Array.isArray(effort)) return void 0;
					const rowEffort = effort;
					if (typeof rowEffort.id !== "string" || typeof rowEffort.name !== "string") return void 0;
					efforts.push({
						id: rowEffort.id,
						name: rowEffort.name,
						...typeof rowEffort.description === "string" ? { description: rowEffort.description } : {}
					});
				}
				models.push({
					...base,
					reasoning: {
						efforts,
						...typeof meta.defaultEffort === "string" ? { defaultEffort: meta.defaultEffort } : {}
					}
				});
			}
			return {
				id: row.id,
				name: row.name,
				models
			};
		}
		function catalogView(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TranslationSettingsFailure("translation/catalog-malformed", "translation catalog is malformed");
			const row = value;
			if (!Array.isArray(row.providers)) throw new TranslationSettingsFailure("translation/catalog-malformed", "translation catalog is malformed");
			const providers = [];
			for (const provider of row.providers) {
				const parsed = catalogProvider(provider);
				if (parsed === void 0) throw new TranslationSettingsFailure("translation/catalog-malformed", "translation catalog is malformed");
				providers.push(parsed);
			}
			const failures = [];
			for (const failure of Array.isArray(row.failures) ? row.failures : []) if (typeof failure === "object" && failure !== null && !Array.isArray(failure) && typeof failure.provider === "string" && typeof failure.message === "string") failures.push(failure.provider);
			return {
				providers,
				failures: failures.map((provider) => ({
					provider,
					message: "catalog entry unavailable"
				}))
			};
		}
		/**
		* Bind the runtime translation settings to one Connection handle.
		* @param connection - Harness Connection handle for loopback RPC.
		* @returns the read/write pair.
		*/
		function createTranslationSettingsApi(connection) {
			const call = async (endpoint, payload, signal) => {
				const result = await connection.rpc.call(TRANSLATION_RPC_CHANNEL, endpoint, payload, signal);
				if (!result.ok) throw new TranslationSettingsFailure(result.error.code ?? "translation/settings-unavailable", result.error.message ?? "translation settings are unavailable");
				return result.value;
			};
			const callCatalog = async (signal) => {
				const result = await connection.rpc.call(TRANSLATION_RPC_CHANNEL, TRANSLATION_RPC.catalog, {}, signal);
				if (!result.ok) throw new TranslationSettingsFailure(result.error.code ?? "translation/catalog-unavailable", result.error.message ?? "translation catalog is unavailable");
				return catalogView(result.value);
			};
			return {
				read: async (signal) => await call(TRANSLATION_RPC.settingsRead, {}, signal),
				write: async (patch, signal) => await call(TRANSLATION_RPC.settingsWrite, patch, signal),
				catalog: callCatalog
			};
		}
		//#endregion
		//#region src/client/translation-runtime.ts
		/** How often the browser re-reads the Host store while the page is visible. */
		const REFRESH_INTERVAL_MS = 1e4;
		const BUNDLE_LABEL = "官方思考过程翻译组合包";
		function labelOf(settings) {
			return settings.backend === "llm" ? `${settings.provider} · ${settings.model}` : BUNDLE_LABEL;
		}
		function sameSettings(a, b) {
			return a.backend === b.backend && a.provider === b.provider && a.model === b.model && a.reasoningEffort === b.reasoningEffort && a.targetLanguage === b.targetLanguage && a.maxTextChars === b.maxTextChars && a.maxTokens === b.maxTokens && a.timeoutMs === b.timeoutMs && a.autoTranslate === b.autoTranslate;
		}
		/** Snapshot store shared by the chat rows and the settings card. */
		var TranslationRuntime = class {
			current;
			snapshotValue;
			listeners = /* @__PURE__ */ new Set();
			hostFace;
			bundleFace;
			api;
			timer;
			pending;
			generation = 0;
			constructor(seed) {
				this.current = seed;
				this.snapshotValue = this.project();
			}
			/** Stable subscription for `useSyncExternalStore`. */
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Stable snapshot getter for `useSyncExternalStore`. */
			getSnapshot = () => this.snapshotValue;
			/** Start reading the Host store and re-reading it while visible. */
			start(api) {
				this.stop();
				this.api = api;
				this.refresh();
				this.timer = setInterval(() => {
					if (typeof document === "undefined" || document.visibilityState === "visible") this.refresh();
				}, REFRESH_INTERVAL_MS);
				if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.onVisible);
				if (typeof window !== "undefined") window.addEventListener("focus", this.onVisible);
			}
			/** Stop polling and drop the client (connection went away). */
			stop() {
				this.generation += 1;
				this.api = void 0;
				if (this.timer !== void 0) {
					clearInterval(this.timer);
					this.timer = void 0;
				}
				if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisible);
				if (typeof window !== "undefined") window.removeEventListener("focus", this.onVisible);
			}
			onVisible = () => {
				if (typeof document === "undefined" || document.visibilityState === "visible") this.refresh();
			};
			/**
			* Re-read the Host store.
			* @returns the applied settings, or `undefined` when the read failed.
			*/
			async refresh() {
				if (this.pending !== void 0) return await this.pending;
				const api = this.api;
				if (api === void 0) return void 0;
				const generation = this.generation;
				this.pending = (async () => {
					try {
						const settings = await api.read();
						if (generation !== this.generation) return void 0;
						this.apply(settings);
						return settings;
					} catch {
						return;
					} finally {
						this.pending = void 0;
					}
				})();
				return await this.pending;
			}
			/** Attach the LLM-bridge face; it is selected only while `backend` is `llm`. */
			setHostFace(face) {
				this.hostFace = face;
				this.publish();
			}
			/** Attach the official-bundle face; it is selected only while `backend` is `bundle`. */
			setBundleFace(face) {
				this.bundleFace = face;
				this.publish();
			}
			/** Apply settings that were just persisted (card save or a poll). */
			apply(settings) {
				if (sameSettings(this.current, settings)) return;
				this.current = settings;
				this.publish();
			}
			project() {
				const settings = this.current;
				return {
					settings,
					face: settings.backend === "llm" ? this.hostFace : this.bundleFace,
					label: labelOf(settings)
				};
			}
			publish() {
				const next = this.project();
				const previous = this.snapshotValue;
				if (next.face === previous.face && next.label === previous.label && sameSettings(next.settings, previous.settings)) return;
				this.snapshotValue = next;
				for (const listener of [...this.listeners]) listener();
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** Locale bundles for the think-box plugin configuration card. */
		/** Dictionary namespace owned by this plugin's settings card. */
		const NS = "settings.thinkBox";
		/**
		* Namespace owning the conversation keys THIS PLUGIN must be able to render
		* but the Harness does not always provide.
		*
		* The plugin consumes keys from two Harness namespaces, and which one owns a
		* given key is not stable across Harness versions:
		*
		* - `conversation` (`dsh-client-ui-conversation`) owns the `image.*` family in
		*   every version, and also owned `message.stopped`, `message.unknownBlock`
		*   and `json.truncated` before those moved to `chat`.
		* - `chat` (`dsh-client-ui-chat`, present from 0.1.5 on) owns `message.think`
		*   and now owns the three keys above. It does not exist at all in rc.6, the
		*   version this package still pins in devDependencies.
		*
		* Neither namespace alone can serve every key this plugin renders, so
		* `index.ts` layers them. This plugin-owned namespace is the final layer; it
		* exists because a plugin may NOT register into `chat` or `conversation` —
		* `LocaleRuntime.register` throws when the (namespace, locale) pair already
		* has an owner, and the Harness owns both.
		*/
		const CHAT_NS = "thinkBox.chat";
		/** English fallback for {@link ThinkBoxChatKey}. */
		const chatEn = {
			"message.think": "Think",
			"image.serviceUnavailable": "Image service unavailable",
			"message.think.translate": "Translate",
			"message.think.original": "Original",
			"message.think.translating": "Translating…",
			"message.think.translateFailed": "Translation failed",
			"message.think.translateRetry": "Retry"
		};
		/** Simplified Chinese fallback for {@link ThinkBoxChatKey}. */
		const chatZh = {
			"message.think": "思考",
			"image.serviceUnavailable": "图片服务不可用",
			"message.think.translate": "查看译文",
			"message.think.original": "查看原文",
			"message.think.translating": "翻译中…",
			"message.think.translateFailed": "翻译失败",
			"message.think.translateRetry": "重试"
		};
		/** English copy. */
		const en = {
			title: "Reasoning display enhancement",
			description: "An inline reasoning box beside the Think row, optional translation, and a model-route picker for choosing the provider, model and reasoning effort. Answer text is rendered by Harness itself.",
			enabled: "Enable the reasoning box",
			enabledHint: "Take over the assistant row to render the inline reasoning box. Turn off to use the built-in Harness renderer.",
			thinkAutoExpand: "Auto-follow reasoning",
			thinkAutoExpandHint: "Scroll the inline reasoning box as the model thinks. Turn off to keep the box still while it streams.",
			readOnly: "This deployment stores settings read-only.",
			loading: "Loading plugin settings…",
			unavailable: "Plugin settings are unavailable in this connection.",
			retry: "Retry",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			unsaved: "Unsaved",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			translationTitle: "Reasoning translation channel",
			translationHint: "Where the translated reasoning comes from. Saved changes apply to the next reasoning block without a restart.",
			translationLoading: "Loading translation settings…",
			translationUnavailable: "Translation settings are unavailable in this connection.",
			translationBackend: "Backend",
			translationBackendHint: "bundle uses the official reasoning-translation bundle (Google, Bing, DeepSeek official API). llm calls a model route directly, e.g. a free OpenAI-compatible provider.",
			translationBackendBundle: "Official bundle (bundle)",
			translationBackendLlm: "Direct model route (llm)",
			translationRoute: "Model route",
			translationCatalogLoading: "Loading the model catalog…",
			translationCatalogFailed: "The model catalog could not be loaded.",
			translationRouteMissing: "The current route is not in the catalog.",
			translationBundleDecides: "The official bundle chooses the service.",
			translationSearchModels: "Search models",
			translationModel: "Model",
			translationEffort: "Reasoning effort",
			translationEffortDefault: "Route default",
			translationTargetLanguage: "Target language",
			translationTargetLanguageHint: "auto follows the UI language; a tag such as zh, en, or ja overrides it.",
			translationMaxTextChars: "Fragment limit (characters)",
			translationMaxTextCharsHint: "Maximum characters per request. Smaller fragments feel more live but send more requests.",
			translationAutoTranslate: "Auto-translate live reasoning",
			translationAutoTranslateHint: "New reasoning blocks translate into the target language while they stream. Historical blocks still need the toggle.",
			translationSaveFailed: "The deployment rejected these values; they were left for you to correct."
		};
		/** Simplified Chinese copy. */
		const zh = {
			title: "思维链显示增强",
			description: "「思考」行右侧的行内推理窗、可选的思考翻译，以及挑选服务商 / 模型 / 推理强度的模型路由选择器。正文由 Harness 自身渲染。",
			enabled: "启用思考框",
			enabledHint: "接管助手行以显示行内思考窗。关闭后交还给 Harness 内置渲染。",
			thinkAutoExpand: "自动跟随思考",
			thinkAutoExpandHint: "思考流式输出时让行内思考框跟随滚动；关闭后思考框保持不动。",
			readOnly: "当前部署将设置存为只读。",
			loading: "正在加载插件设置…",
			unavailable: "当前连接无法读取插件设置。",
			retry: "重试",
			save: "保存",
			saving: "保存中…",
			discard: "放弃",
			unsaved: "未保存",
			saveFailed: "部署没有接受这些值，已保留供你修改。",
			translationTitle: "思考翻译通道",
			translationHint: "译文从哪里来。保存后对下一段思考生效，无需重启。",
			translationLoading: "正在加载翻译设置…",
			translationUnavailable: "当前连接无法读取翻译设置。",
			translationBackend: "后端",
			translationBackendHint: "bundle 使用官方「思考过程翻译」组合包（Google、Bing、DeepSeek 官方 API）；llm 直连模型路由，例如免费的 OpenAI 兼容服务。",
			translationBackendBundle: "官方组合包（bundle）",
			translationBackendLlm: "直连模型路由（llm）",
			translationRoute: "模型路由",
			translationCatalogLoading: "正在加载模型目录…",
			translationCatalogFailed: "模型目录加载失败。",
			translationRouteMissing: "当前路由不在列表中",
			translationBundleDecides: "官方组合包决定服务。",
			translationSearchModels: "搜索模型",
			translationModel: "模型",
			translationEffort: "推理强度",
			translationEffortDefault: "路由默认",
			translationTargetLanguage: "目标语言",
			translationTargetLanguageHint: "auto 跟随界面语言；也可以填 zh、en、ja 等标签。",
			translationMaxTextChars: "分片上限（字符）",
			translationMaxTextCharsHint: "单个请求的最大字符数。分片越小越接近实时，但请求更多。",
			translationAutoTranslate: "自动翻译流式思考",
			translationAutoTranslateHint: "新产生的思考块在流式过程中自动翻译；历史思考块仍需手动点击。",
			translationSaveFailed: "部署拒绝了这些值，已保留供你修改。"
		};
		//#endregion
		//#region src/client/index.ts
		/**
		* Cordis services required by the browser half. Only `slots` is load-bearing
		* for the stream itself; locale and Connection power the configuration card
		* and are wired through `ctx.inject` below so a deployment without them still
		* streams with defaults.
		*/
		const inject = ["slots"];
		/**
		* Preference keys the older Host build may have carried instead of the current
		* snapshot. Their presence alone is a real disagreement only when the two
		* remaining booleans are malformed; extra legacy fields are ignored.
		*/
		const BOOT_SETTING_KEYS = ["enabled", "thinkAutoExpand"];
		/** Whether any preference field is present in a boot global value. */
		function hasPreferenceFields(raw) {
			if (typeof raw !== "object" || raw === null) return false;
			return BOOT_SETTING_KEYS.some((key) => key in raw);
		}
		/** React function/class or an exotic component such as memo/forwardRef/lazy. */
		function isWrappableComponent(value) {
			return typeof value === "function" || value !== null && typeof value === "object" && "$$typeof" in value;
		}
		/**
		* Read the Host-bridged boot config. The inline script is produced by this
		* plugin's Host half from a schema-validated value, so only the structural
		* guarantees that could break between the two halves are re-checked: the
		* global is absent when the client runs without its Host entry (defaults
		* apply), and a malformed preference fails loudly instead of rendering a
		* half-configured view.
		*
		* Extra keys are ignored: during the build window the running Host can still
		* serve its previous boot HTML (old engine fields) while the new client bundle
		* is already on disk. Missing preferences fall back to defaults with an info
		* line; a present-but-broken preference is a hard error.
		* @returns The resolved configuration for the assistant node view.
		*/
		function readBootConfig() {
			const raw = globalThis[THINK_BOX_BOOT_GLOBAL];
			if (raw === void 0) {
				console.info("[dsh-think-box] no host config bridge; using defaults");
				return DEFAULT_THINK_BOX_CONFIG;
			}
			const malformed = () => /* @__PURE__ */ new Error(`[dsh-think-box] malformed ${THINK_BOX_BOOT_GLOBAL} boot global: ${JSON.stringify(raw)}`);
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw malformed();
			const snapshot = readSettingsSnapshot(raw);
			if (snapshot === void 0 && hasPreferenceFields(raw)) throw malformed();
			if (snapshot === void 0) {
				console.info(`[dsh-think-box] ${THINK_BOX_BOOT_GLOBAL} predates the preference snapshot; using defaults`);
				return DEFAULT_THINK_BOX_CONFIG;
			}
			return {
				enabled: snapshot.enabled,
				thinkAutoExpand: snapshot.thinkAutoExpand,
				translation: readTranslationConfig(raw.translation)
			};
		}
		/**
		* Validate the two preference fields the Host folds into the boot global. The
		* Host reads both volatile references before injecting the script, so these are
		* plain values here; malformed values mean the two halves disagree.
		* @param raw - boot global value.
		* @returns the validated preferences, or `undefined` when malformed.
		*/
		function readSettingsSnapshot(raw) {
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return void 0;
			const value = raw;
			if (typeof value.enabled !== "boolean" || typeof value.thinkAutoExpand !== "boolean") return void 0;
			return {
				enabled: value.enabled,
				thinkAutoExpand: value.thinkAutoExpand
			};
		}
		/**
		* Validate the optional translation block of the boot config. A Host older
		* than the LLM bridge omits it, which falls back to the official bundle.
		* @param raw - serialized translation config from the boot global.
		* @returns the validated translation config.
		*/
		function readTranslationConfig(raw) {
			if (raw === void 0) return DEFAULT_THINK_BOX_CONFIG.translation;
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error(`[dsh-think-box] malformed translation boot config: ${JSON.stringify(raw)}`);
			const value = raw;
			if (value.backend !== "bundle" && value.backend !== "llm" || typeof value.provider !== "string" || value.provider === "" || typeof value.model !== "string" || value.model === "" || value.reasoningEffort !== void 0 && typeof value.reasoningEffort !== "string" || typeof value.targetLanguage !== "string" || value.targetLanguage === "" || typeof value.maxTextChars !== "number" || !Number.isInteger(value.maxTextChars) || value.maxTextChars < 2 || typeof value.maxTokens !== "number" || !Number.isInteger(value.maxTokens) || value.maxTokens < 1 || typeof value.timeoutMs !== "number" || value.timeoutMs < 1 || value.autoTranslate !== void 0 && typeof value.autoTranslate !== "boolean") throw new Error(`[dsh-think-box] malformed translation boot config: ${JSON.stringify(raw)}`);
			return {
				backend: value.backend,
				provider: value.provider,
				model: value.model,
				reasoningEffort: typeof value.reasoningEffort === "string" && value.reasoningEffort !== "" ? value.reasoningEffort : DEFAULT_THINK_BOX_CONFIG.translation.reasoningEffort,
				targetLanguage: value.targetLanguage,
				maxTextChars: value.maxTextChars,
				maxTokens: value.maxTokens,
				timeoutMs: value.timeoutMs,
				autoTranslate: typeof value.autoTranslate === "boolean" ? value.autoTranslate : DEFAULT_THINK_BOX_CONFIG.translation.autoTranslate
			};
		}
		/**
		* A live settings cell shared by the renderer lifecycle and React views. It
		* starts on the Host's boot snapshot (the resolved profile config read through
		* the volatile references at Host apply time) and follows the plugin-owned
		* controller once the optional settings services arrive. Without a Host bridge
		* the shared defaults apply.
		*/
		var SettingsCell = class {
			listeners = /* @__PURE__ */ new Set();
			card;
			value;
			pending = false;
			/** @param initial - boot-time snapshot to render before the card resolves. */
			constructor(initial = DEFAULT_THINK_BOX_SETTINGS) {
				this.value = initial;
			}
			/** Re-point the cell at the plugin-owned settings controller. */
			attach(card) {
				this.card = card;
				this.refresh();
				const unsubscribe = card.subscribe(() => {
					this.refresh();
				});
				return () => {
					unsubscribe();
					if (this.card !== card) return;
					this.card = void 0;
					this.refresh();
				};
			}
			read() {
				const snapshot = this.card?.getSnapshot();
				if (snapshot === void 0 || snapshot.status !== "ready") return this.value;
				return this.card?.values() ?? this.value;
			}
			refresh() {
				const next = this.read();
				const pending = this.card?.getSnapshot().status === "loading";
				if (pending === this.pending && next.enabled === this.value.enabled && next.thinkAutoExpand === this.value.thinkAutoExpand) return;
				this.pending = pending;
				this.value = next;
				for (const listener of this.listeners) listener();
			}
			/** False while an available settings service is resolving its authority. */
			takeoverEnabled() {
				return !this.pending && this.value.enabled;
			}
			/**
			* True only once an attached settings service has produced its loaded values.
			* Until then — and when no settings service is composed at all — `value` is
			* still the shared client default, so callers that must not let that default
			* shadow the install-time config have to ask before trusting it.
			*/
			ready() {
				return this.card?.getSnapshot().status === "ready";
			}
			getSnapshot = () => this.value;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
		};
		/**
		* Register the typewriter renderer after the conversation package declares the
		* keyed Chat node seat. A lower priority shadows the built-in assistant row;
		* every other keyed renderer is wrapped in place so Context, commands, Tool
		* cards, retries, and workflow runs share one extensible follow boundary. The
		* Host-bridged configuration
		* no longer selects engine knobs: the reasoning box ships one cadence. The
		* plugin-owned settings RPC supplies the live enable/auto-follow preferences
		* when the settings surface is composed.
		* @param ctx - Browser context carrying the shared slot registry.
		*/
		function apply(ctx) {
			const disposers = [];
			const keep = (value) => {
				if (typeof value === "function") {
					disposers.push(value);
					return;
				}
				const disposable = value;
				if (disposable !== null && typeof disposable?.dispose === "function") disposers.push(() => {
					disposable.dispose();
				});
			};
			const releaseOwnership = claimApplyOwnership(() => {
				for (const dispose of [...disposers].reverse()) dispose();
			});
			const config = readBootConfig();
			const settings = new SettingsCell(readSettingsSnapshot(config) ?? DEFAULT_THINK_BOX_SETTINGS);
			const translation = new TranslationRuntime(config.translation);
			let translationSettingsApi;
			const waitTranslationApi = async () => {
				for (let attempt = 0; attempt < 30; attempt += 1) {
					if (translationSettingsApi !== void 0) return translationSettingsApi;
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
				throw new Error("translation settings are not connected");
			};
			keep(ctx.inject(["connection", "locale"], (hostCtx) => {
				const connection = hostCtx.get("connection");
				const settingsApi = createTranslationSettingsApi(connection);
				translationSettingsApi = settingsApi;
				translation.setHostFace(createHostTranslationFace(connection, () => String(hostCtx.locale.getLocale().active)));
				translation.start(settingsApi);
				return () => {
					translation.stop();
					translation.setHostFace(void 0);
					translationSettingsApi = void 0;
				};
			}));
			keep(ctx.inject(["remote.cotTranslation", "locale"], (cotCtx) => {
				const remote = cotCtx.get("remote.cotTranslation");
				if (remote === void 0) return;
				translation.setBundleFace(createReasoningTranslationFace(remote, () => String(cotCtx.locale.getLocale().active)));
				return () => {
					translation.setBundleFace(void 0);
				};
			}));
			/**
			* Layered `t` for the assistant renderer.
			*
			* The renderer's keys have no single owner: `conversation` owns the
			* `image.*` family in every Harness version, `chat` (0.1.5+) owns
			* `message.think`, and three `message.*` keys MOVED from `conversation` to
			* `chat` between the version this package pins and the current one. Binding
			* the slot to either namespace alone degrades a real slice of the UI to raw
			* keys, which is the defect this replaces.
			*
			* The order is deliberate: `conversation` first, so the pinned Harness keeps
			* resolving the keys it still owns there; then `chat` for what moved or is
			* new; then this plugin's own namespace for keys no Harness version
			* provides. A namespace that is not registered returns its key unchanged
			* (`LocaleRuntime.bind` does not throw), so an older Harness without `chat`
			* falls straight through.
			*
			* The reference is built once and held stable: the seat feeds a memoized
			* renderer, and a fresh identity per render would defeat that memoization.
			* Until the locale service arrives the seat's own binding stays in use.
			*/
			let assistantT;
			keep(ctx.inject(["locale"], (localeCtx) => {
				localeCtx.effect(() => localeCtx.locale.register(CHAT_NS, {
					zh: chatZh,
					en: chatEn
				}), "dsh-think-box: conversation fallback dictionary");
				const conversationT = localeCtx.locale.bind("conversation");
				const chatT = localeCtx.locale.bind("chat");
				const fallbackT = localeCtx.locale.bind(CHAT_NS);
				const merged = (key, params) => {
					const primary = conversationT(key, params);
					if (primary !== key) return primary;
					const secondary = chatT(key, params);
					if (secondary !== key) return secondary;
					return fallbackT(key, params);
				};
				const bound = merged;
				assistantT = bound;
				return () => {
					if (assistantT === bound) assistantT = void 0;
				};
			}));
			keep(ctx.inject([
				"slots",
				"locale",
				"connection"
			], (settingsCtx) => {
				const translationBridge = {
					initial: translation.getSnapshot().settings,
					read: async (signal) => await (await waitTranslationApi()).read(signal),
					write: async (patch) => {
						const next = await (await waitTranslationApi()).write(patch);
						translation.apply(next);
						return next;
					},
					catalog: async (signal) => await (await waitTranslationApi()).catalog(signal),
					apply: (settings) => {
						translation.apply(settings);
					}
				};
				const card = new ThinkBoxCardController(createThinkBoxSettingsApi(settingsCtx.get("connection")), translationBridge);
				const detachSettings = settings.attach(card);
				card.start();
				settingsCtx.effect(() => settingsCtx.locale.register(NS, {
					zh,
					en
				}), "dsh-think-box: settings dictionaries");
				settingsCtx.slots.inject("plugins.bundle.config", () => settingsCtx.slots.register({
					name: "plugins.bundle.config",
					key: "@local/dsh-think-box",
					locale: NS,
					inject: () => card.inject()
				}, ThinkBoxConfigPage));
				return () => {
					card.stop();
					detachSettings();
				};
			}));
			const configured = function ThinkBoxConfiguredView(props) {
				const preferences = (0, react.useSyncExternalStore)(settings.subscribe, settings.getSnapshot, settings.getSnapshot);
				const translationSnapshot = (0, react.useSyncExternalStore)(translation.subscribe, translation.getSnapshot, translation.getSnapshot);
				return (0, react.createElement)(ReasoningAssistantNodeView, {
					...props,
					...assistantT === void 0 ? {} : { t: assistantT },
					thinkAutoExpand: preferences.thinkAutoExpand,
					translation: translationSnapshot.face,
					translationLabel: translationSnapshot.label,
					autoTranslate: translationSnapshot.settings.autoTranslate
				});
			};
			keep(ctx.slots.inject("conversation.chat.node", () => {
				let taken;
				let releaseFallback;
				let syncing = false;
				const findBuiltin = () => ctx.slots.entries("conversation.chat.node").find((entry) => entry.options.key === "assistant-step" && entry.options.registrant !== "dsh-think-box" && entry.component !== configured);
				const entryPresent = (entry) => ctx.slots.entries("conversation.chat.node").includes(entry);
				/**
				* Drop whatever takeover this instance owns.
				* @param restore - put the built-in component back when this instance still
				* owns the entry; a component installed by someone else is never clobbered.
				*/
				const release = (restore) => {
					if (releaseFallback !== void 0) {
						releaseFallback();
						releaseFallback = void 0;
					}
					if (taken !== void 0) {
						if (restore && taken.entry.component === configured) taken.entry.component = taken.original;
						taken = void 0;
					}
				};
				const takeOver = () => {
					const builtin = findBuiltin();
					if (builtin !== void 0 && isWrappableComponent(builtin.component)) {
						taken = {
							entry: builtin,
							original: builtin.component
						};
						builtin.component = configured;
						return;
					}
					releaseFallback = ctx.slots.register({
						name: "conversation.chat.node",
						key: "assistant-step",
						priority: -100,
						locale: "conversation",
						registrant: "dsh-think-box"
					}, configured);
				};
				const syncTakeover = () => {
					if (syncing) return;
					syncing = true;
					try {
						syncTakeoverUnsafe();
					} finally {
						syncing = false;
					}
				};
				const syncTakeoverUnsafe = () => {
					if (!settings.takeoverEnabled()) {
						release(true);
						return;
					}
					if (taken !== void 0) {
						if (entryPresent(taken.entry) && taken.entry.component === configured) return;
						release(false);
					} else if (releaseFallback !== void 0) {
						if (findBuiltin() === void 0) return;
						release(false);
					}
					takeOver();
				};
				const offSlotChange = ctx.on("slots/changed", (key) => {
					if (key !== "conversation.chat.node") return;
					syncTakeover();
				});
				const unsubscribe = settings.subscribe(syncTakeover);
				syncTakeover();
				return () => {
					unsubscribe();
					offSlotChange();
					release(true);
				};
			}));
			ctx.effect(() => releaseOwnership, "dsh-think-box: client apply ownership");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map