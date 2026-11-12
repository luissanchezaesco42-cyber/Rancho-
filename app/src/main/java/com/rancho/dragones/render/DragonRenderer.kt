package com.rancho.dragones.render

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.Species
import kotlin.math.PI
import kotlin.math.sin

/**
 * Dibuja dragones y huevos con formas vectoriales. Todo se dibuja en una caja
 * de 100x100 centrada en el origen, mirando a la derecha, y se escala a `size`.
 */
object DragonRenderer {
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val path = Path()
    private val rect = RectF()

    fun lighten(color: Int, f: Float): Int {
        val r = Color.red(color) + ((255 - Color.red(color)) * f).toInt()
        val g = Color.green(color) + ((255 - Color.green(color)) * f).toInt()
        val b = Color.blue(color) + ((255 - Color.blue(color)) * f).toInt()
        return Color.rgb(r, g, b)
    }

    private fun oval(c: Canvas, l: Float, t: Float, r: Float, b: Float, color: Int) {
        rect.set(l, t, r, b)
        fill.color = color
        c.drawOval(rect, fill)
    }

    private fun tri(c: Canvas, x1: Float, y1: Float, x2: Float, y2: Float, x3: Float, y3: Float, color: Int) {
        path.reset()
        path.moveTo(x1, y1); path.lineTo(x2, y2); path.lineTo(x3, y3); path.close()
        fill.color = color
        c.drawPath(path, fill)
    }

    fun draw(c: Canvas, s: Species, cx: Float, cy: Float, size: Float, t: Float, flip: Boolean = false) {
        val main = s.primary.color
        val dark = s.primary.dark
        val accent = s.secondary ?: s.primary
        val belly = lighten(main, 0.55f)
        val wingColor = if (s.secondary != null) accent.color else dark
        val u = size / 100f
        val bob = sin(t * 3f) * 2f
        val flap = sin(t * 6f)
        val wag = sin(t * 4f)

        fill.style = Paint.Style.FILL
        // sombra en el suelo (sin voltear ni rebotar)
        c.save()
        c.translate(cx, cy)
        c.scale(u, u)
        oval(c, -28f, 40f, 28f, 50f, 0x33000000)
        c.restore()

        c.save()
        c.translate(cx, cy + bob * u)
        if (flip) c.scale(-1f, 1f)
        c.scale(u, u)

        // alas (detrás del cuerpo)
        val fy = flap * 8f
        path.reset()
        path.moveTo(-6f, -4f); path.lineTo(-40f, -40f + fy); path.lineTo(-26f, -20f)
        path.lineTo(-34f, -6f + fy * 0.4f); path.lineTo(-14f, 6f); path.close()
        fill.color = wingColor
        c.drawPath(path, fill)
        tri(c, -4f, -2f, -22f, -32f + fy * 0.7f, -12f, -8f, lighten(wingColor, 0.25f))

        // cola
        line.color = main
        line.strokeWidth = 11f
        path.reset()
        path.moveTo(-22f, 20f)
        path.quadTo(-44f, 34f + wag * 3f, -50f, 10f + wag * 6f)
        c.drawPath(path, line)
        tri(c, -54f, 6f + wag * 6f, -44f, 4f + wag * 6f, -50f, 20f + wag * 6f, accent.dark)

        // patas
        oval(c, -22f, 32f, -2f, 48f, dark)
        oval(c, 6f, 32f, 26f, 48f, dark)

        // cuerpo y barriga
        oval(c, -30f, -14f, 28f, 42f, main)
        oval(c, -16f, 0f, 22f, 40f, belly)

        // púas del lomo
        for (i in 0..3) {
            val x = -24f + i * 11f
            tri(c, x, -10f - i * 0.6f, x + 5f, -22f - i * 0.6f, x + 10f, -12f - i * 0.6f, dark)
        }

        // cabeza
        oval(c, 8f, -38f, 44f, -4f, main)
        oval(c, 26f, -26f, 52f, -6f, lighten(main, 0.35f))
        fill.color = dark
        c.drawCircle(44f, -20f, 1.8f, fill)
        c.drawCircle(48f, -17f, 1.8f, fill)
        // cuernos
        tri(c, 14f, -34f, 10f, -52f, 24f, -38f, 0xFFFFF3C4.toInt())
        tri(c, 26f, -38f, 32f, -54f, 36f, -36f, 0xFFFFF3C4.toInt())
        // ojo
        fill.color = Color.WHITE
        c.drawCircle(30f, -26f, 5.5f, fill)
        fill.color = 0xFF222222.toInt()
        c.drawCircle(31.5f, -26f, 3f, fill)
        fill.color = Color.WHITE
        c.drawCircle(32.5f, -27.2f, 1f, fill)
        // sonrisa
        line.color = dark
        line.strokeWidth = 1.6f
        path.reset()
        path.moveTo(36f, -10f); path.quadTo(44f, -7f, 50f, -11f)
        c.drawPath(path, line)

        for (e in s.elements) decorate(c, e, t, flap, wag)
        c.restore()
    }

    /** Adorno propio de cada elemento. */
    private fun decorate(c: Canvas, e: Element, t: Float, flap: Float, wag: Float) {
        when (e) {
            Element.FUEGO -> {
                val h = 14f + sin(t * 9f) * 3f
                path.reset()
                path.moveTo(-52f, 8f + wag * 6f)
                path.quadTo(-62f, -4f, -54f, -h + 8f + wag * 6f)
                path.quadTo(-48f, -2f, -46f, 8f + wag * 6f)
                path.close()
                fill.color = 0xFFFFC832.toInt()
                c.drawPath(path, fill)
                fill.color = 0xFFFF5A1F.toInt()
                c.drawCircle(-52f, 8f + wag * 6f, 4f, fill)
            }
            Element.AGUA -> {
                tri(c, 12f, -34f, 4f, -42f, 4f, -22f, 0xFF8FD0FF.toInt())
                tri(c, 0f, 12f, -6f, 26f, 8f, 22f, 0xFF8FD0FF.toInt())
                fill.color = 0xFFE6F6FF.toInt()
                c.drawCircle(-6f + sin(t * 2f) * 2f, 8f, 2.2f, fill)
                c.drawCircle(4f, 20f + sin(t * 2.5f) * 2f, 1.8f, fill)
            }
            Element.PLANTA -> {
                oval(c, 14f, -52f, 30f, -42f, 0xFF2E8A31.toInt())
                oval(c, 24f, -50f, 38f, -42f, 0xFF59C45B.toInt())
                fill.color = 0xFFFF7BAC.toInt()
                c.drawCircle(-10f, -2f, 3f, fill)
                c.drawCircle(4f, 8f, 2.5f, fill)
            }
            Element.TIERRA -> {
                tri(c, -20f, -12f, -14f, -30f, -6f, -12f, 0xFF8E8E8E.toInt())
                tri(c, -4f, -12f, 4f, -34f, 12f, -12f, 0xFFA8A8A8.toInt())
                fill.color = 0xFF6B4A2B.toInt()
                c.drawCircle(-8f, 18f, 3f, fill)
                c.drawCircle(6f, 28f, 2.4f, fill)
            }
            Element.AIRE -> {
                line.color = 0xFFFFFFFF.toInt()
                line.strokeWidth = 2f
                for (i in 0..1) {
                    val dy = i * 10f
                    path.reset()
                    path.moveTo(-40f, -14f + dy)
                    path.quadTo(-30f, -22f + dy + flap * 3f, -22f, -14f + dy)
                    c.drawPath(path, line)
                }
            }
            Element.RAYO -> {
                path.reset()
                path.moveTo(2f, 4f); path.lineTo(-8f, 20f); path.lineTo(0f, 20f)
                path.lineTo(-6f, 36f); path.lineTo(12f, 14f); path.lineTo(3f, 14f); path.lineTo(10f, 4f)
                path.close()
                fill.color = if (sin(t * 12f) > 0.2f) 0xFFFFF176.toInt() else 0xFFFFD93B.toInt()
                c.drawPath(path, fill)
            }
        }
    }

    /** Huevo mezclando los colores de los dos padres. */
    fun drawEgg(c: Canvas, a: Element, b: Element, cx: Float, cy: Float, size: Float, t: Float, ready: Boolean) {
        val u = size / 100f
        c.save()
        c.translate(cx, cy)
        val wobble = if (ready) sin(t * 10f) * 6f else sin(t * 2f) * 1.5f
        c.rotate(wobble)
        c.scale(u, u)
        fill.style = Paint.Style.FILL
        oval(c, -28f, 40f, 28f, 50f, 0x33000000)
        rect.set(-30f, -48f, 30f, 46f)
        fill.color = lighten(a.color, 0.35f)
        c.drawOval(rect, fill)
        // manchas con el color del otro padre
        c.save()
        path.reset()
        path.addOval(rect, Path.Direction.CW)
        c.clipPath(path)
        fill.color = b.color
        c.drawCircle(-12f, -14f, 11f, fill)
        c.drawCircle(14f, 8f, 14f, fill)
        c.drawCircle(-6f, 28f, 9f, fill)
        c.restore()
        fill.color = 0x55FFFFFF
        oval(c, -18f, -36f, -6f, -14f, 0x66FFFFFF)
        if (ready) {
            line.color = Color.WHITE
            line.strokeWidth = 3f
            path.reset()
            path.moveTo(-18f, 2f); path.lineTo(-8f, -6f); path.lineTo(0f, 4f); path.lineTo(10f, -6f); path.lineTo(18f, 2f)
            c.drawPath(path, line)
        }
        c.restore()
    }

    /** Ángulo auxiliar para animaciones circulares. */
    fun cycle(t: Float, speed: Float): Float = ((t * speed) % 1f) * (2 * PI).toFloat()
}
