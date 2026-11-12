package com.rancho.dragones.ui

import android.graphics.RectF
import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Species

/** Una pestaña del juego. Se dibuja cada fotograma dentro de `area`. */
abstract class Screen {
    /** Colores del degradado de fondo (arriba, abajo). */
    abstract val bgTop: Int
    abstract val bgBottom: Int

    abstract fun draw(ui: Ui, g: Game, area: RectF, t: Float)

    /** Si hay algo que reclamar en esta pestaña (punto rojo en la barra). */
    open fun badge(g: Game): Boolean = false
}

fun describe(sp: Species): String = sp.elements.joinToString(" / ") { it.label }

fun describe(d: Dragon): String = "${d.species.nombre}  Nv ${d.level}"

fun mmss(sec: Int): String = "%d:%02d".format(sec / 60, sec % 60)
