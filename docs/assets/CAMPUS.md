# Tratamento da foto do campus

Em 24/10/2026, a pedido do usuario, a [foto original](../../public/images/campus.jpg), com 399 x 501 pixels, recebeu tratamento de nitidez e super-resolucao com a ferramenta integrada image_gen, em modo de edicao. O resultado tem 1119 x 1405 pixels, aproximadamente 7,9 vezes a quantidade de pixels original. Nao foi usado fluxo de API ou chave do usuario.

A imagem foi inspecionada visualmente antes da aplicacao. A composicao reconhecivel da fachada, rampa e vegetacao foi mantida; detalhes finos foram reconstruidos por IA e nao constituem documentacao fiel de elementos invisiveis no original. A tela de login nao teve sua composicao alterada.

Versoes consumidas pelo aplicativo: [WebP](../../public/images/campus-hd.webp), qualidade 90, 415.752 bytes; [JPEG alternativo](../../public/images/campus-hd.jpg), qualidade 92, 454.496 bytes. A codificacao para web ocorreu depois do tratamento, sem outra alteracao visual. O PNG original do resultado foi copiado para outputs/imagens/campus-melhorado.png, fora deste repositorio. A fotografia de origem e a versao comprimida anterior foram preservadas.

## Prompt utilizado

```text
Edit target: the supplied 399x501 photograph of the UNIFACISA university entrance. Primary request: CONSERVATIVE PHOTO RESTORATION AND SUPER-RESOLUTION, substantially increase clarity and resolve blocky compression / pixelation when displayed large in a university login screen. Deliver one high resolution portrait photograph, ideally about 1600x2000 pixels or higher, keeping exactly the original 399:501 composition and viewpoint. This is restoration of the same photograph, NOT redesign of the real building. Preserve all architecture, curved glass facade, exact window grid and doors, white walls, ramp, metal handrails, concrete seams, plants and trees, shadows, sky/cloud composition, natural colors and lighting. Keep the complete original frame. Preserve the original welcome sign text exactly 'Sejam bem-vindos!' and the existing small UNIFACISA brand on the sign. Reduce JPEG blocks, edge stair-stepping and blur gently, improve fine edge definition with realistic natural textures. Do not beautify or remodel the campus, change proportions, add or remove structures, people, objects or landscaping. Avoid synthetic glossy rendering, dramatic color grading, excessive HDR, oversharpening halos or invented readable signs. No UI, no border, no overlay, no watermark. The result must remain recognizably the SAME real photograph with improved resolution and sharpness, not a new interpretation.
```

A resolucao acima e a efetivamente produzida; a dimensao sugerida no prompt nao foi usada como alegacao de entrega.
