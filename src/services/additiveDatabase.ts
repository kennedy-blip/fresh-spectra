export type AdditiveRisk = 'elevated' | 'watch' | 'context';
export type NovaGroup = 1 | 2 | 3 | 4;

export interface AdditiveEntry {
  id: string;
  name: string;
  eNumber?: string;
  aliases: string[];
  category: string;
  risk: AdditiveRisk;
  flag: string;
  note: string;
  swap: string;
  ultraProcessedSignal?: boolean;
}

export interface AdditiveAudit {
  novaGroup: NovaGroup;
  novaLabel: string;
  matches: AdditiveEntry[];
  riskFlags: string[];
  cleanSwap: string;
  ingredientCount: number;
  score: number;
}

export const ADDITIVE_DATABASE: AdditiveEntry[] = [
  { id: 'tartrazine', name: 'Tartrazine', eNumber: 'E102', aliases: ['yellow 5', 'fd&c yellow no. 5', 'fd&c yellow 5'], category: 'Synthetic colour', risk: 'watch', flag: 'Dye sensitivity watch', note: 'Some children may be sensitive to certain synthetic colours; individual response varies.', swap: 'Choose naturally coloured foods or products without added colour.', ultraProcessedSignal: true },
  { id: 'sunset-yellow', name: 'Sunset Yellow FCF', eNumber: 'E110', aliases: ['yellow 6', 'sunset yellow', 'fd&c yellow no. 6'], category: 'Synthetic colour', risk: 'watch', flag: 'Dye sensitivity watch', note: 'A synthetic colour; colour-associated sensitivity is not a diagnosis.', swap: 'Look for a product with no added colour.', ultraProcessedSignal: true },
  { id: 'allura-red', name: 'Allura Red AC', eNumber: 'E129', aliases: ['red 40', 'allura red', 'fd&c red no. 40'], category: 'Synthetic colour', risk: 'watch', flag: 'Dye sensitivity watch', note: 'A synthetic colour flagged for context-dependent sensitivity in some consumers.', swap: 'Try an uncoloured or naturally coloured alternative.', ultraProcessedSignal: true },
  { id: 'azorubine', name: 'Carmoisine / Azorubine', eNumber: 'E122', aliases: ['azorubine', 'carmoisine'], category: 'Synthetic colour', risk: 'watch', flag: 'Synthetic dye', note: 'Colour additive; regulatory permissions and label rules vary by market.', swap: 'Choose products using fruit or vegetable colour.', ultraProcessedSignal: true },
  { id: 'ponceau', name: 'Ponceau 4R', eNumber: 'E124', aliases: ['ponceau 4r', 'cochineal red a'], category: 'Synthetic colour', risk: 'watch', flag: 'Synthetic dye', note: 'Synthetic colour used in some confectionery and drinks.', swap: 'Choose a product without added colour.', ultraProcessedSignal: true },
  { id: 'brilliant-blue', name: 'Brilliant Blue FCF', eNumber: 'E133', aliases: ['blue 1', 'fd&c blue no. 1'], category: 'Synthetic colour', risk: 'watch', flag: 'Synthetic dye', note: 'A synthetic blue colour; sensitivity is individual and uncommon.', swap: 'Select a naturally coloured alternative.', ultraProcessedSignal: true },
  { id: 'indigotine', name: 'Indigotine', eNumber: 'E132', aliases: ['blue 2', 'indigo carmine'], category: 'Synthetic colour', risk: 'watch', flag: 'Synthetic dye', note: 'A synthetic colour with jurisdiction-specific permitted uses.', swap: 'Choose products without artificial colour.', ultraProcessedSignal: true },
  { id: 'quinoline-yellow', name: 'Quinoline Yellow', eNumber: 'E104', aliases: ['quinoline yellow'], category: 'Synthetic colour', risk: 'watch', flag: 'Synthetic dye', note: 'A synthetic colour; approved uses differ by country.', swap: 'Try a naturally coloured or uncoloured version.', ultraProcessedSignal: true },
  { id: 'erythrosine', name: 'Erythrosine', eNumber: 'E127', aliases: ['red 3', 'erythrosine'], category: 'Synthetic colour', risk: 'watch', flag: 'Synthetic dye', note: 'A colour additive with restrictions that vary by jurisdiction.', swap: 'Choose a product without added colour.', ultraProcessedSignal: true },
  { id: 'caramel-iv', name: 'Caramel colour IV', eNumber: 'E150d', aliases: ['caramel color iv', 'ammonia sulfite caramel', 'class iv caramel'], category: 'Colour', risk: 'context', flag: 'Processing marker', note: 'A colour additive; its presence signals formulation, not a direct safety verdict.', swap: 'Choose a lightly processed product if that is your preference.', ultraProcessedSignal: true },
  { id: 'titanium-dioxide', name: 'Titanium dioxide', eNumber: 'E171', aliases: ['titanium dioxide', 'tio2'], category: 'Whitening colour', risk: 'elevated', flag: 'Regulatory watch', note: 'Food-use authorization differs by jurisdiction; check current local rules.', swap: 'Choose a product without whitening colour.', ultraProcessedSignal: true },
  { id: 'sodium-nitrite', name: 'Sodium nitrite', eNumber: 'E250', aliases: ['sodium nitrite', 'nitrite', 'curing salt'], category: 'Curing preservative', risk: 'watch', flag: 'Nitrosamine context', note: 'Used in curing; high-heat cooking and overall processed-meat intake are relevant context.', swap: 'Use fresh, unprocessed protein more often; follow safe cooking guidance.', ultraProcessedSignal: true },
  { id: 'sodium-nitrate', name: 'Sodium nitrate', eNumber: 'E251', aliases: ['sodium nitrate', 'nitrate curing salt'], category: 'Curing preservative', risk: 'watch', flag: 'Curing agent', note: 'A curing agent; food-source and dose context matter.', swap: 'Choose uncured options when practical.', ultraProcessedSignal: true },
  { id: 'potassium-nitrate', name: 'Potassium nitrate', eNumber: 'E252', aliases: ['potassium nitrate', 'saltpeter'], category: 'Curing preservative', risk: 'watch', flag: 'Curing agent', note: 'Used in some cured foods; not a stand-alone measure of product safety.', swap: 'Choose fresh or minimally processed protein more often.', ultraProcessedSignal: true },
  { id: 'polysorbate-80', name: 'Polysorbate 80', eNumber: 'E433', aliases: ['polysorbate 80', 'tween 80'], category: 'Emulsifier', risk: 'watch', flag: 'Emulsifier / microbiome research', note: 'Emulsifier under ongoing gut-barrier and microbiome research; human dietary evidence remains context-dependent.', swap: 'Choose simpler dressings or mix oil, acid and herbs at home.', ultraProcessedSignal: true },
  { id: 'polysorbate-60', name: 'Polysorbate 60', eNumber: 'E435', aliases: ['polysorbate 60', 'tween 60'], category: 'Emulsifier', risk: 'context', flag: 'Emulsifier', note: 'Used to stabilize texture in packaged foods.', swap: 'Look for a short ingredient list if you prefer fewer emulsifiers.', ultraProcessedSignal: true },
  { id: 'carboxymethylcellulose', name: 'Carboxymethyl cellulose', eNumber: 'E466', aliases: ['cellulose gum', 'cmc', 'sodium carboxymethyl cellulose'], category: 'Thickener / emulsifier', risk: 'watch', flag: 'Gut-microbiome research', note: 'A thickener studied for possible effects on gut physiology; findings do not prove harm at normal intake.', swap: 'Choose a product thickened with familiar kitchen ingredients.', ultraProcessedSignal: true },
  { id: 'carrageenan', name: 'Carrageenan', eNumber: 'E407', aliases: ['carrageenan', 'irish moss extract'], category: 'Thickener', risk: 'context', flag: 'GI sensitivity context', note: 'Food-grade carrageenan is distinct from degraded poligeenan; some people report individual sensitivity.', swap: 'Try a carrageenan-free option if it does not suit you.', ultraProcessedSignal: true },
  { id: 'mono-diglycerides', name: 'Mono- and diglycerides', eNumber: 'E471', aliases: ['mono and diglycerides', 'monoglycerides', 'diglycerides', 'mono-diglycerides'], category: 'Emulsifier', risk: 'context', flag: 'Emulsifier', note: 'Common texture aid; can contain fatty acids from different sources.', swap: 'Choose simpler baked goods or dressings.', ultraProcessedSignal: true },
  { id: 'datem', name: 'DATEM', eNumber: 'E472e', aliases: ['diacetyl tartaric acid esters', 'datem'], category: 'Dough conditioner', risk: 'context', flag: 'Industrial dough aid', note: 'Dough-strengthening emulsifier used in commercial bread.', swap: 'Look for bread made from flour, water, starter or yeast, and salt.', ultraProcessedSignal: true },
  { id: 'ssl', name: 'Sodium stearoyl lactylate', eNumber: 'E481', aliases: ['sodium stearoyl lactylate', 'ssl'], category: 'Emulsifier', risk: 'context', flag: 'Emulsifier', note: 'Used to improve texture in commercial baked products.', swap: 'Choose a shorter-label bread or bake at home.', ultraProcessedSignal: true },
  { id: 'lecithin', name: 'Lecithin', eNumber: 'E322', aliases: ['soy lecithin', 'sunflower lecithin', 'soya lecithin'], category: 'Emulsifier', risk: 'context', flag: 'Emulsifier', note: 'A common emulsifier derived from egg, soy, sunflower or other sources.', swap: 'If avoiding it, choose products without added emulsifier.', ultraProcessedSignal: true },
  { id: 'propylene-glycol-alginate', name: 'Propylene glycol alginate', eNumber: 'E405', aliases: ['propylene glycol alginate', 'pga'], category: 'Stabilizer', risk: 'context', flag: 'Texture stabilizer', note: 'A stabilizer used in dressings and beverages.', swap: 'Try an oil-and-vinegar dressing with no stabilizer.', ultraProcessedSignal: true },
  { id: 'bht', name: 'Butylated hydroxytoluene', eNumber: 'E321', aliases: ['bht', 'butylated hydroxytoluene'], category: 'Antioxidant preservative', risk: 'watch', flag: 'Preservative watch', note: 'Permitted uses and limits vary; regulatory assessment is jurisdiction-specific.', swap: 'Choose a product without added synthetic antioxidant.', ultraProcessedSignal: true },
  { id: 'bha', name: 'Butylated hydroxyanisole', eNumber: 'E320', aliases: ['bha', 'butylated hydroxyanisole'], category: 'Antioxidant preservative', risk: 'watch', flag: 'Preservative watch', note: 'A synthetic antioxidant with market-specific use limits.', swap: 'Choose foods with a shorter ingredient list.', ultraProcessedSignal: true },
  { id: 'tbhq', name: 'TBHQ', eNumber: 'E319', aliases: ['tertiary butylhydroquinone', 'tert-butylhydroquinone'], category: 'Antioxidant preservative', risk: 'watch', flag: 'Preservative watch', note: 'Used in some fats and snacks; authorized limits are set by regulators.', swap: 'Choose less packaged snack foods when convenient.', ultraProcessedSignal: true },
  { id: 'sodium-benzoate', name: 'Sodium benzoate', eNumber: 'E211', aliases: ['sodium benzoate', 'benzoate'], category: 'Preservative', risk: 'context', flag: 'Preservative', note: 'A common preservative; formulation and storage conditions affect product chemistry.', swap: 'Choose a freshly prepared drink or sauce if desired.', ultraProcessedSignal: true },
  { id: 'potassium-sorbate', name: 'Potassium sorbate', eNumber: 'E202', aliases: ['potassium sorbate', 'sorbate'], category: 'Preservative', risk: 'context', flag: 'Preservative', note: 'Used to inhibit yeasts and moulds in many foods.', swap: 'Choose fresh or frozen options if you prefer fewer preservatives.', ultraProcessedSignal: true },
  { id: 'sulfites', name: 'Sulfur dioxide / sulfites', eNumber: 'E220', aliases: ['sulfur dioxide', 'sulphur dioxide', 'sulfites', 'sulphites', 'sodium metabisulfite'], category: 'Preservative', risk: 'watch', flag: 'Asthma / sensitivity declaration', note: 'Sulfites can trigger reactions in some sensitive people; labeling rules vary by market.', swap: 'Look for a sulfite-free alternative if you are sensitive.', ultraProcessedSignal: true },
  { id: 'calcium-propionate', name: 'Calcium propionate', eNumber: 'E282', aliases: ['calcium propionate', 'propionate'], category: 'Mould inhibitor', risk: 'context', flag: 'Bread preservative', note: 'A mould inhibitor used in packaged baked goods.', swap: 'Choose fresh bread or freeze a preservative-free loaf.', ultraProcessedSignal: true },
  { id: 'edta', name: 'Calcium disodium EDTA', eNumber: 'E385', aliases: ['edta', 'calcium disodium edta', 'disodium edta'], category: 'Sequestrant', risk: 'context', flag: 'Chelating preservative', note: 'A sequestrant used to preserve colour and flavour in some packaged foods.', swap: 'Try a freshly made dressing or sauce.', ultraProcessedSignal: true },
  { id: 'sucralose', name: 'Sucralose', eNumber: 'E955', aliases: ['sucralose', 'splenda'], category: 'Non-sugar sweetener', risk: 'context', flag: 'Sweetener / tolerance varies', note: 'A high-intensity sweetener; personal taste and digestive tolerance vary.', swap: 'Choose unsweetened drinks or gradually reduce sweetness.', ultraProcessedSignal: true },
  { id: 'aspartame', name: 'Aspartame', eNumber: 'E951', aliases: ['aspartame', 'nutrasweet', 'equal sweetener'], category: 'Non-sugar sweetener', risk: 'context', flag: 'Phenylalanine source', note: 'People with phenylketonuria (PKU) must avoid phenylalanine sources; labels carry required warnings.', swap: 'Choose an unsweetened drink or a sweetener that suits your needs.', ultraProcessedSignal: true },
  { id: 'acesulfame-k', name: 'Acesulfame potassium', eNumber: 'E950', aliases: ['acesulfame k', 'acesulfame potassium', 'ace-k', 'acesulfame'], category: 'Non-sugar sweetener', risk: 'context', flag: 'High-intensity sweetener', note: 'A non-nutritive sweetener used in drinks and desserts.', swap: 'Try water, sparkling water or an unsweetened option.', ultraProcessedSignal: true },
  { id: 'saccharin', name: 'Saccharin', eNumber: 'E954', aliases: ['saccharin'], category: 'Non-sugar sweetener', risk: 'context', flag: 'High-intensity sweetener', note: 'A high-intensity sweetener; regulations and acceptable daily intake guidance apply.', swap: 'Choose unsweetened products if you want to avoid sweeteners.', ultraProcessedSignal: true },
  { id: 'maltodextrin', name: 'Maltodextrin', aliases: ['maltodextrin'], category: 'Refined carbohydrate', risk: 'watch', flag: 'Rapidly digestible carrier', note: 'A refined starch-derived ingredient; it can raise blood glucose quickly, with response depending on dose and meal.', swap: 'Choose products with intact grains or fewer refined fillers.', ultraProcessedSignal: true },
  { id: 'hfcs', name: 'High-fructose corn syrup', aliases: ['hfcs', 'corn syrup', 'glucose-fructose syrup', 'isoglucose'], category: 'Added sugar', risk: 'watch', flag: 'Added sugar', note: 'A source of added sugars; frequency and total intake matter more than the name alone.', swap: 'Compare added-sugar values and choose unsweetened options more often.', ultraProcessedSignal: true },
  { id: 'invert-sugar', name: 'Invert sugar syrup', aliases: ['invert sugar', 'inverted sugar syrup', 'invert syrup'], category: 'Added sugar', risk: 'watch', flag: 'Added sugar', note: 'A liquid sweetener made from sucrose; it contributes free sugars.', swap: 'Choose a less sweet product or fresh fruit.', ultraProcessedSignal: true },
  { id: 'msg', name: 'Monosodium glutamate', eNumber: 'E621', aliases: ['msg', 'monosodium glutamate', 'flavour enhancer 621'], category: 'Flavour enhancer', risk: 'context', flag: 'Flavour enhancer', note: 'A flavour enhancer; controlled studies do not support broad claims of harm at typical food levels.', swap: 'Use herbs, spices, tomato, mushrooms or fermented ingredients for savouriness.', ultraProcessedSignal: true },
  { id: 'yeast-extract', name: 'Yeast extract', aliases: ['yeast extract', 'autolyzed yeast'], category: 'Flavour enhancer', risk: 'context', flag: 'Concentrated savoury flavour', note: 'A savoury flavour ingredient containing naturally occurring glutamates.', swap: 'Use herbs, spices or mushrooms if you prefer a simpler flavour base.', ultraProcessedSignal: true },
  { id: 'disodium-inosinate', name: 'Disodium inosinate', eNumber: 'E631', aliases: ['disodium inosinate', 'inosinate'], category: 'Flavour enhancer', risk: 'context', flag: 'Flavour enhancer', note: 'Often paired with glutamate to boost savoury flavour.', swap: 'Choose a less highly seasoned or minimally processed option.', ultraProcessedSignal: true },
  { id: 'disodium-guanylate', name: 'Disodium guanylate', eNumber: 'E627', aliases: ['disodium guanylate', 'guanylate'], category: 'Flavour enhancer', risk: 'context', flag: 'Flavour enhancer', note: 'A nucleotide flavour enhancer; may be unsuitable for people advised to limit purines.', swap: 'Choose a simple seasoning blend or whole-food snack.', ultraProcessedSignal: true },
  { id: 'modified-starch', name: 'Modified starch', eNumber: 'E14xx', aliases: ['modified food starch', 'modified corn starch', 'modified tapioca starch', 'modified potato starch'], category: 'Texture modifier', risk: 'context', flag: 'Formulation marker', note: 'A starch altered for texture or stability; the source and processing function vary.', swap: 'Look for a simpler recipe or make a sauce with whole-food ingredients.', ultraProcessedSignal: true },
  { id: 'artificial-flavour', name: 'Artificial flavour', aliases: ['artificial flavor', 'artificial flavours', 'artificial flavors', 'nature identical flavour'], category: 'Flavouring', risk: 'context', flag: 'Flavour formulation', note: 'A broad label category for flavouring substances, not one specific chemical.', swap: 'Choose products flavoured with recognizable herbs, spices or food ingredients.', ultraProcessedSignal: true },
  { id: 'propylene-glycol', name: 'Propylene glycol', eNumber: 'E1520', aliases: ['propylene glycol'], category: 'Humectant / carrier', risk: 'context', flag: 'Carrier / humectant', note: 'Used in small amounts as a carrier or humectant; permitted uses are regulated.', swap: 'Choose a product without added carrier ingredients if preferred.', ultraProcessedSignal: true },
  { id: 'phosphate', name: 'Phosphate additives', eNumber: 'E339', aliases: ['sodium phosphate', 'phosphoric acid', 'dipotassium phosphate', 'calcium phosphate', 'phosphate'], category: 'Acidity / texture regulator', risk: 'watch', flag: 'Phosphate load context', note: 'People with chronic kidney disease may be advised to monitor phosphate additives with a clinician.', swap: 'Choose minimally processed foods and check with your care team if phosphate-restricted.', ultraProcessedSignal: true },
  { id: 'xanthan-gum', name: 'Xanthan gum', eNumber: 'E415', aliases: ['xanthan gum'], category: 'Thickener', risk: 'context', flag: 'Texture stabilizer', note: 'A common ferment-derived thickener; large quantities can affect digestion for some people.', swap: 'Try a dressing thickened with blended whole foods.', ultraProcessedSignal: true },
  { id: 'guar-gum', name: 'Guar gum', eNumber: 'E412', aliases: ['guar gum'], category: 'Thickener', risk: 'context', flag: 'Texture stabilizer', note: 'A plant-derived soluble fiber used as a thickener.', swap: 'Choose a product with a simpler texture system if desired.', ultraProcessedSignal: true },
  { id: 'gellan-gum', name: 'Gellan gum', eNumber: 'E418', aliases: ['gellan gum'], category: 'Gelling agent', risk: 'context', flag: 'Stabilizer', note: 'A fermentation-produced stabilizer used in beverages and desserts.', swap: 'Choose a less formulated version if that matches your preference.', ultraProcessedSignal: true },
  { id: 'carrageenan-poligeenan', name: 'Poligeenan', aliases: ['poligeenan', 'degraded carrageenan'], category: 'Not an approved food additive in many markets', risk: 'elevated', flag: 'Name / source verification', note: 'Do not confuse poligeenan with food-grade carrageenan; verify the exact ingredient and local rules.', swap: 'Contact the manufacturer if this term appears on a food label.', ultraProcessedSignal: true },
  { id: 'canola-oil', name: 'Canola oil', aliases: ['rapeseed oil', 'low erucic acid rapeseed oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A common cooking oil; this flag reflects processing preference, not evidence that the oil is inherently toxic.', swap: 'Use olive, avocado or another oil that suits your cooking and budget.', ultraProcessedSignal: true },
  { id: 'soybean-oil', name: 'Soybean oil', aliases: ['soy oil', 'soya oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A widely used vegetable oil; no single ingredient determines a food’s healthfulness.', swap: 'Choose an oil you prefer or reduce frequency of packaged foods.', ultraProcessedSignal: true },
  { id: 'corn-oil', name: 'Corn oil', aliases: ['maize oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A common refined oil; consider overall dietary pattern and cooking use.', swap: 'Use an oil you prefer for your cooking method.', ultraProcessedSignal: true },
  { id: 'sunflower-oil', name: 'Sunflower oil', aliases: ['high oleic sunflower oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A common vegetable oil; the high-oleic and standard versions have different fatty-acid profiles.', swap: 'Choose the oil and preparation style that fit your needs.', ultraProcessedSignal: true },
  { id: 'safflower-oil', name: 'Safflower oil', aliases: ['high oleic safflower oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A refined oil; this is a preference cue rather than a toxin determination.', swap: 'Use an oil you prefer and vary fat sources across meals.', ultraProcessedSignal: true },
  { id: 'cottonseed-oil', name: 'Cottonseed oil', aliases: ['cotton seed oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A refined oil used in some packaged foods; oil quality and total diet matter.', swap: 'Choose a product made with an oil you prefer.', ultraProcessedSignal: true },
  { id: 'grapeseed-oil', name: 'Grapeseed oil', aliases: ['grape seed oil'], category: 'Refined vegetable oil', risk: 'context', flag: 'Refined oil preference', note: 'A refined oil; the label does not by itself indicate a health risk.', swap: 'Select an oil based on taste, cooking temperature and budget.', ultraProcessedSignal: true },
  { id: 'palm-oil', name: 'Palm oil', aliases: ['palm kernel oil', 'palm olein', 'palm fat'], category: 'Tropical vegetable fat', risk: 'context', flag: 'Fat / sourcing context', note: 'Consider saturated-fat content and sourcing certification; not a toxin flag.', swap: 'Choose a product with a fat profile and sourcing you prefer.', ultraProcessedSignal: true },
  { id: 'hydrogenated-oil', name: 'Partially hydrogenated oil', aliases: ['partially hydrogenated vegetable oil', 'hydrogenated shortening'], category: 'Industrial fat', risk: 'elevated', flag: 'Trans-fat label check', note: 'Partially hydrogenated oils are a source of industrial trans fat and are restricted or banned in many countries.', swap: 'Avoid products listing partially hydrogenated oils; check local trans-fat rules.', ultraProcessedSignal: true },
  { id: 'erythritol', name: 'Erythritol', eNumber: 'E968', aliases: ['erythritol'], category: 'Polyol sweetener', risk: 'context', flag: 'Sugar alcohol / GI tolerance', note: 'Large servings can cause digestive effects; research on cardiovascular associations is not conclusive for dietary causality.', swap: 'Use smaller portions or choose an unsweetened product.', ultraProcessedSignal: true },
  { id: 'maltitol', name: 'Maltitol', eNumber: 'E965', aliases: ['maltitol', 'maltitol syrup'], category: 'Polyol sweetener', risk: 'context', flag: 'Sugar alcohol / GI tolerance', note: 'Can cause gas or laxative effects in larger amounts and may affect blood glucose.', swap: 'Check serving size or choose a less sweet alternative.', ultraProcessedSignal: true },
  { id: 'acesulfame', name: 'Steviol glycosides', eNumber: 'E960', aliases: ['stevia extract', 'steviol glycosides', 'stevia'], category: 'Non-sugar sweetener', risk: 'context', flag: 'High-intensity sweetener', note: 'A plant-derived high-intensity sweetener; blends may include other fillers.', swap: 'Choose unsweetened food or a sweetness level you prefer.', ultraProcessedSignal: true },
  { id: 'sodium-alginate', name: 'Sodium alginate', eNumber: 'E401', aliases: ['sodium alginate', 'alginate'], category: 'Thickener', risk: 'context', flag: 'Texture stabilizer', note: 'A seaweed-derived thickener used in sauces and desserts.', swap: 'Choose a simple recipe if you prefer fewer texture additives.', ultraProcessedSignal: true },
  { id: 'ascorbic-acid', name: 'Ascorbic acid', eNumber: 'E300', aliases: ['ascorbic acid', 'vitamin c'], category: 'Antioxidant / acidity regulator', risk: 'context', flag: 'Common antioxidant', note: 'Vitamin C used to protect colour or flavour; generally a low-concern ingredient for most people.', swap: 'No swap needed unless you have a specific sensitivity.', ultraProcessedSignal: false },
  { id: 'citric-acid', name: 'Citric acid', eNumber: 'E330', aliases: ['citric acid'], category: 'Acidity regulator', risk: 'context', flag: 'Common acidity regulator', note: 'A common acidulant, often produced by fermentation; not automatically a sign of poor quality.', swap: 'No swap needed unless you have a specific reason to avoid it.', ultraProcessedSignal: false },
  { id: 'tocopherols', name: 'Mixed tocopherols', eNumber: 'E306', aliases: ['mixed tocopherols', 'vitamin e'], category: 'Antioxidant', risk: 'context', flag: 'Common antioxidant', note: 'Vitamin E compounds used to slow oxidation in oils.', swap: 'No swap needed unless you have a specific sensitivity.', ultraProcessedSignal: false },
  { id: 'rosemary-extract', name: 'Rosemary extract', eNumber: 'E392', aliases: ['rosemary extract'], category: 'Antioxidant', risk: 'context', flag: 'Botanical antioxidant', note: 'A plant-derived antioxidant used to protect fats from oxidation.', swap: 'No swap needed; this is a common botanical preservative.', ultraProcessedSignal: false },
];

export const GROCERY_PRESETS = [
  {
    id: 'kids-cereal',
    name: 'Popular kids cereal',
    tagline: 'Sweetened · coloured · fortified',
    ingredients: 'Whole grain corn, sugar, corn syrup, canola oil, salt, trisodium phosphate, artificial flavor, Yellow 5, Red 40, Blue 1, BHT, maltodextrin.',
  },
  {
    id: 'energy-drink',
    name: 'Zero-sugar energy drink',
    tagline: 'Sweeteners · colour · preservatives',
    ingredients: 'Carbonated water, citric acid, taurine, sodium citrate, sucralose, acesulfame potassium, caffeine, natural flavors, potassium sorbate, sodium benzoate, Red 40.',
  },
  {
    id: 'salad-dressing',
    name: 'Commercial salad dressing',
    tagline: 'Emulsified · shelf-stable',
    ingredients: 'Water, soybean oil, vinegar, sugar, salt, xanthan gum, polysorbate 80, calcium disodium EDTA, natural flavors, potassium sorbate.',
  },
  {
    id: 'sourdough',
    name: 'Clean whole-food sourdough',
    tagline: 'Flour · water · starter · salt',
    ingredients: 'Whole wheat flour, water, sourdough starter (flour, water), sea salt.',
  },
];

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function findAdditiveMatches(label: string): AdditiveEntry[] {
  const normalizedLabel = ` ${normalize(label).replace(/\be\s+(?=\d)/g, 'e')} `;
  return ADDITIVE_DATABASE.filter((entry) => {
    const terms = [entry.name, ...(entry.eNumber ? [entry.eNumber] : []), ...entry.aliases];
    return terms.some((term) => {
      const normalizedTerm = normalize(term);
      if (normalizedTerm.length < 3) return false;
      return normalizedLabel.includes(` ${normalizedTerm} `);
    });
  });
}

export function classifyNova(label: string, matches = findAdditiveMatches(label)): AdditiveAudit {
  const ingredients = label.split(/[;,\n]/).map((part) => part.trim()).filter(Boolean);
  const normalized = normalize(label);
  const ultraSignals = matches.filter((entry) => entry.ultraProcessedSignal !== false);
  const formulationMarkers = /\b(maltodextrin|modified starch|high fructose corn syrup|corn syrup|artificial flavor|artificial color|hydrolyzed|isolate|emulsifier|hydrogenated|sweetener)\b/.test(normalized);
  const simpleCulinaryMarkers = /\b(salt|sugar|oil|butter|honey|vinegar)\b/.test(normalized);
  let novaGroup: NovaGroup;
  if (ultraSignals.length >= 2 || formulationMarkers || ingredients.length >= 10) novaGroup = 4;
  else if (simpleCulinaryMarkers || ingredients.length > 1) novaGroup = 3;
  else novaGroup = 1;

  const riskFlags = Array.from(new Set(ultraSignals.map((entry) => entry.flag))).slice(0, 5);
  const suggestions = Array.from(new Set(matches.map((entry) => entry.swap)));
  const cleanSwap = novaGroup === 4
    ? 'Try a shorter-label option built around recognizable ingredients; compare added sugar and sodium on the panel.'
    : novaGroup === 3
      ? 'This looks closer to a processed or culinary staple. Pair it with whole produce and check the serving size.'
      : 'The ingredient list appears simple. Keep the rest of the meal varied and balanced.';
  if (suggestions.length > 0 && novaGroup === 4) {
    return {
      novaGroup,
      novaLabel: `Group ${novaGroup} · Ultra-processed formulation cues`,
      matches,
      riskFlags,
      cleanSwap: suggestions[0],
      ingredientCount: ingredients.length,
      score: Math.min(100, 34 + ultraSignals.length * 12 + (formulationMarkers ? 14 : 0)),
    };
  }
  return {
    novaGroup,
    novaLabel: novaGroup === 1 ? 'Group 1 · Unprocessed / minimally processed cues' : `Group ${novaGroup} · Processed culinary / food cues`,
    matches,
    riskFlags,
    cleanSwap,
    ingredientCount: ingredients.length,
    score: Math.min(100, 20 + ultraSignals.length * 14 + (novaGroup === 4 ? 20 : 0)),
  };
}
