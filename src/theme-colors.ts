/**
 * Paleta de cores 1Música para adaptação de ilustrações
 * Use essas variáveis ao importar SVGs ou Illustrations
 */

export const themeColors = {
  // Primária (vermelha/rosa)
  primary: "#FF5A5F",
  primaryLight: "#FFE4E4",
  primaryDark: "#e04f53",
  primaryMuted: "#FFF4F2",

  // Secundária (verde esmeralda)
  secondary: "#4CAF50",
  secondaryLight: "#E8F5E9",
  secondaryDark: "#388E3C",

  // Terciária (laranja)
  tertiary: "#FF9800",
  tertiaryLight: "#FFF7ED",
  tertiaryDark: "#F57C00",

  // Neutras
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray900: "#111827",
  white: "#FFFFFF",

  // Acentos
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444"
}

/**
 * Variáveis CSS para usar em SVGs e Ilustrações
 * Adicione isso no seu root CSS ou use nos estilos inline
 */
export const cssVariables = `
  :root {
    --color-primary: ${themeColors.primary};
    --color-primary-light: ${themeColors.primaryLight};
    --color-primary-dark: ${themeColors.primaryDark};
    --color-secondary: ${themeColors.secondary};
    --color-secondary-light: ${themeColors.secondaryLight};
    --color-tertiary: ${themeColors.tertiary};
    --color-tertiary-light: ${themeColors.tertiaryLight};
    --color-gray-50: ${themeColors.gray50};
    --color-gray-100: ${themeColors.gray100};
    --color-gray-900: ${themeColors.gray900};
  }
`

/**
 * Mapeamento de cores para adaptação de ilustrações
 * Se você importar SVGs de bibliotecas como Undraw ou Illustrations.co
 * Use esses valores para substituir as cores originais
 */
export const colorMapping = {
  // Cores comuns em ilustrações → Nossas cores
  replacements: {
    // Se a ilustração tem rosa/vermelho
    "#FF5252": themeColors.primary,
    "#FF6B6B": themeColors.primary,
    "#FA5252": themeColors.primary,

    // Se tem verde
    "#51CF66": themeColors.secondary,
    "#40C057": themeColors.secondary,

    // Se tem laranja
    "#FFA94D": themeColors.tertiary,
    "#FF922B": themeColors.tertiary,

    // Se tem cinza escuro (fundo)
    "#2C3E50": themeColors.gray600,
    "#34495E": themeColors.gray600,
    "#2F3542": themeColors.gray600,

    // Se tem cinza claro
    "#ECF0F1": themeColors.gray100,
    "#E8E8E8": themeColors.gray100
  }
}

/**
 * Função para adaptar SVG inline
 * Exemplo de uso:
 * const adaptedSvg = adaptSvgColors(originalSvg, { from: "#FF5252", to: themeColors.primary })
 */
export function adaptSvgColors(
  svgString: string,
  colorMap: Record<string, string> = colorMapping.replacements
): string {
  let result = svgString
  Object.entries(colorMap).forEach(([from, to]) => {
    result = result.replace(new RegExp(from, "gi"), to)
  })
  return result
}

/**
 * Guia para adaptar ilustrações de bibliotecas populares:
 *
 * UNDRAW (undraw.co):
 * 1. Faça download do SVG
 * 2. Abra em um editor de código
 * 3. Procure por tags como fill="#4F46E5" ou stroke="#4F46E5"
 * 4. Substitua pela nossa cor primária: #FF5A5F
 *
 * ILLUSTRATIONS.CO:
 * 1. Customize a cor no site deles antes de baixar, ou
 * 2. Use a função adaptSvgColors() com seu mapeamento
 *
 * LOTTIE:
 * 1. Edite o JSON da animação
 * 2. Procure por seções "c": {"k": [r, g, b, a]}
 * 3. Converta RGB para valores 0-1: RGB(255, 90, 95) → [1, 0.35, 0.37, 1]
 *
 * SVG CUSTOMIZATION NO REACT:
 * <svg>
 *   <style>{`
 *     .primary { fill: var(--color-primary); }
 *     .secondary { fill: var(--color-secondary); }
 *   `}</style>
 *   <rect className="primary" />
 * </svg>
 */
