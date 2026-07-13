package io.legado.app.lib.webdav

open class WebDavException(
    msg: String,
    val responseCode: Int? = null
) : Exception(msg) {

    override fun fillInStackTrace(): Throwable {
        return this
    }

}

class ObjectNotFoundException(msg: String) : WebDavException(msg, 404)
