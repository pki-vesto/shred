# Product Roadmap

## Status Van Deze Roadmap

Er is in de huidige Shred-repo en backup geen bestaand bestand gevonden met exact 200 Shred-doelen. Dit document canoniseert daarom de 200 doelen voor Shred Tracker op basis van de huidige code, de productbrief en Health Core-context. Toekomstige agents moeten deze lijst als bron van waarheid gebruiken en niet opnieuw impliciet doelen verzinnen.

## Afhankelijkheden

- Training intelligence hangt af van stabiele set/RIR/volume data.
- Nutrition intelligence hangt af van productkwaliteit en voldoende logged days.
- Recovery hangt af van Apple Health via Health Core.
- AI coach hangt af van deterministic analytics.
- Digital fitness twin hangt af van Health Core observations, experimenten en predictions.

## Training Goals 1-25

1. Behoud 90-dagen programma als huidige basis.
2. Documenteer programma-entiteit voor toekomstige blocks.
3. Houd bestaande exercise IDs stabiel.
4. Breid setmodel backward compatible uit met RIR.
5. Toon vorige sessie per concrete oefening.
6. Verbeter PR-types: weight, reps, volume, estimated 1RM.
7. Voeg volume per spiergroep/categorie toe.
8. Voeg weekvolume trends toe.
9. Maak deloadweken zichtbaar in analytics.
10. Maak suggested deload verklaarbaar.
11. Voeg kniebelasting score per sessie toe.
12. Sorteer swaps blijvend op knieveiligheid.
13. Voeg favoriete swaps toe.
14. Voeg equipment notes toe.
15. Voeg bodyweight oefening volume-equivalent toe.
16. Voeg cardio duration/intensity logging toe.
17. Voeg zone 2 hartslagcontext toe.
18. Voeg interval workout completion details toe.
19. Maak missed-session recovery advies.
20. Voeg training density toe.
21. Voeg session readiness modifier toe.
22. Voeg exercise progression recommendations toe.
23. Voeg slot-level progression rules toe.
24. Maak programma templates exporteerbaar.
25. Maak training end-of-phase report.

## Nutrition Goals 26-50

26. Behoud productgebaseerde food logs.
27. Bewaak historical product macro integrity.
28. Verbeter product search ranking.
29. Voeg barcode/label handmatige invoerstructuur toe.
30. Voeg recipe versioning toe.
31. Voeg meal template analytics toe.
32. Voeg frequent meal quick-add toe.
33. Verbeter voice proposal UX.
34. Maak pending voice proposals robuust.
35. Voeg confidence indicator bij AI lookup toe.
36. Voeg macro data quality score toe.
37. Voeg calorie cycling ontwerp toe.
38. Voeg protein per kg berekening toe.
39. Voeg fiber veld voorbereid toe.
40. Voeg hydration voorbereid toe.
41. Maak weekend compliance analyse.
42. Maak meal timing analyse.
43. Voeg training-day/rest-day nutrition comparison toe.
44. Voeg low-protein warnings toe.
45. Voeg calorie trend versus weight trend toe.
46. Voeg product substitution suggestions toe.
47. Voeg shopping/prep hints toe zonder SaaS features.
48. Maak nutrition export CSV.
49. Maak nutrition weekreview.
50. Maak nutrition phase report.

## Recovery Goals 51-75

51. Ontwerp recovery data model.
52. Integreer Apple Health slaap via Health Core.
53. Integreer HRV via Health Core.
54. Integreer rusthartslag via Health Core.
55. Integreer stappen via Health Core.
56. Voeg sleep debt berekening toe.
57. Voeg HRV baseline toe.
58. Voeg RHR baseline toe.
59. Voeg readiness score toe.
60. Toon readiness evidence.
61. Voeg fatigue notes toe.
62. Voeg soreness/pain notes toe.
63. Voeg knie-pijn signaal toe.
64. Maak deload advies recovery-aware.
65. Maak high-risk day warning.
66. Voeg sickness/manual override toe.
67. Voeg recovery trend chart toe.
68. Voeg recovery weekly review toe.
69. Correlate sleep with training volume.
70. Correlate HRV/RHR with performance.
71. Voeg recovery recommendations toe.
72. Voeg low-impact cardio fallback toe.
73. Voeg recovery data missing state toe.
74. Maak recovery export.
75. Maak recovery phase report.

## Body Goals 76-100

76. Behoud daily weight logging.
77. Verbeter 7/14-day trendgewicht.
78. Voeg EWMA trendgewicht toe.
79. Voeg weigh-in consistency score toe.
80. Voeg waist measurement toe.
81. Voeg hip/chest/arm measurements toe.
82. Voeg measurement sync type toe.
83. Voeg photo comparison view toe.
84. Voeg weekly photo completeness toe.
85. Voeg body composition notes toe.
86. Voeg recomposition status toe.
87. Voeg trendweight forecast toe.
88. Voeg plateau detection v2 toe.
89. Voeg rapid-loss warning toe.
90. Correlate calories with trendweight.
91. Correlate steps with trendweight.
92. Correlate training volume with body trend.
93. Voeg phase body report toe.
94. Voeg body export toe.
95. Voeg data plausibility checks toe.
96. Voeg source priority tussen Shred/Apple weight toe.
97. Voeg before/after 90-day report toe.
98. Voeg measurement reminders toe.
99. Voeg body dashboard cards toe.
100. Maak recomposition confidence score.

## AI Goals 101-125

101. Behoud structured output voor AI calls.
102. Houd AI writes preview-first.
103. Voeg AI weekreview toe.
104. Voeg AI nutrition review toe.
105. Voeg AI training review toe.
106. Voeg AI recovery review toe.
107. Voeg AI body trend explanation toe.
108. Voeg evidence references toe.
109. Voeg confidence per recommendation toe.
110. Voeg missing-data questions toe.
111. Voeg scenario analysis toe.
112. Voeg product macro correction loop toe.
113. Voeg voice clarification flow toe.
114. Voeg Dutch-first coaching tone toe.
115. Voeg deterministic facts block toe.
116. Voeg AI cost/error observability toe.
117. Voeg prompt versioning toe.
118. Voeg prompt regression tests toe.
119. Voeg local fallback summaries toe.
120. Voeg safety boundaries toe.
121. Voeg no-medical-claims guard toe.
122. Voeg plan adjustment proposals toe.
123. Voeg experiment interpretation toe.
124. Voeg end-of-phase AI report toe.
125. Voeg digital twin narrative layer toe.

## Health Core Goals 126-150

126. Behoud best-effort dual-write.
127. Documenteer formula versions.
128. Voeg read integration client toe.
129. Voeg Health Core availability state toe.
130. Lees Apple Health steps summary.
131. Lees sleep summary.
132. Lees HRV summary.
133. Lees RHR summary.
134. Lees VO2max trend.
135. Voeg source-aware bodyweight view toe.
136. Voeg experiment registry UI toe.
137. Voeg experiment outcomes toe.
138. Voeg correlation cards toe.
139. Voeg predictions cards toe.
140. Voeg observation drilldown toe.
141. Voeg ingest quality status toe.
142. Voeg quarantine warning toe.
143. Voeg Core schema compatibility checks toe.
144. Voeg Core backfill reconciliation doc toe.
145. Voeg Health Core read cache toe.
146. Voeg offline fallback voor Core reads toe.
147. Voeg Core-derived readiness inputs toe.
148. Voeg Core-derived daily briefing toe.
149. Voeg Health Core backup status toe.
150. Maak Shred/Core contract tests.

## Analytics Goals 151-175

151. Verbeter overview KPI cards.
152. Voeg 90-day heatmap filters toe.
153. Voeg training completion heatmap toe.
154. Voeg nutrition compliance heatmap toe.
155. Voeg recovery heatmap toe.
156. Voeg body trend chart v2 toe.
157. Voeg volume trend chart toe.
158. Voeg PR timeline toe.
159. Voeg macro trend chart toe.
160. Voeg weekly report view toe.
161. Voeg phase report view toe.
162. Voeg dashboard empty states toe.
163. Voeg dashboard error states toe.
164. Voeg confidence badges toe.
165. Voeg data coverage score toe.
166. Voeg anomaly detection toe.
167. Voeg correlation explanations toe.
168. Voeg experiment dashboard toe.
169. Voeg goal pace dashboard toe.
170. Voeg knee-risk dashboard toe.
171. Voeg readiness dashboard toe.
172. Voeg exportable report JSON toe.
173. Voeg printable report HTML toe.
174. Voeg dashboard performance budget toe.
175. Maak analytics test fixtures.

## Platform Goals 176-200

176. Behoud vanilla frontend.
177. Behoud Node/Express/SQLite stack.
178. Behoud Tailscale-only exposure.
179. Documenteer auth boundary.
180. Voeg optional bearer-auth ontwerp toe zonder default change.
181. Houd service worker cache discipline.
182. Voeg SW update UX toe.
183. Voeg sync diagnostics toe.
184. Voeg local backup/export UI toe.
185. Voeg migration registry toe.
186. Voeg schema smoke tests toe.
187. Voeg sync contract tests toe.
188. Voeg voice route tests toe.
189. Voeg product lookup tests toe.
190. Voeg Health Core dual-write tests toe.
191. Voeg Playwright smoke voor PWA toe.
192. Voeg mobile viewport checks toe.
193. Voeg accessibility pass toe.
194. Voeg performance budget toe.
195. Voeg log redaction regels toe.
196. Voeg secrets handling doc toe.
197. Voeg restore runbook toe.
198. Voeg release checklist toe.
199. Houd docs als source of truth actueel.
200. Maak Digital Fitness Twin milestone review.

