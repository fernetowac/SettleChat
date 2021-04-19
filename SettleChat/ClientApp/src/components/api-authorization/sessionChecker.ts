import Sha256 from './Sha256'

/**
 * Content of the file is taken and customized from checksession iframe of IdentityServer/oidc-client
 * */
const cookieName = 'idsrv.session'
function getCookies() {
    const allCookies = document.cookie
    const cookies = allCookies.split(';')
    return cookies
        .map(function (value) {
            const parts = value.trim().split('=')
            if (parts.length === 2) {
                return {
                    name: parts[0].trim(),
                    value: parts[1].trim(),
                }
            }
        })
        .filter(function (item) {
            return item && item.name && item.value
        })
}

function getBrowserSessionId() {
    const cookies = getCookies().filter(function (cookie) {
        return cookie && cookie.name === cookieName
    })
    return cookies[0] && cookies[0].value
}

/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/ */
const b64map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const b64pad = '='

function hex2b64(h: string) {
    let i
    let c
    let ret = ''
    for (i = 0; i + 3 <= h.length; i += 3) {
        c = parseInt(h.substring(i, i + 3), 16)
        ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63)
    }
    if (i + 1 == h.length) {
        c = parseInt(h.substring(i, i + 1), 16)
        ret += b64map.charAt(c << 2)
    } else if (i + 2 == h.length) {
        c = parseInt(h.substring(i, i + 2), 16)
        ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4)
    }
    if (b64pad) while ((ret.length & 3) > 0) ret += b64pad
    return ret
}

function base64UrlEncode(s: string) {
    let val = hex2b64(s)

    val = val.replace(/=/g, '') // Remove any trailing '='s
    val = val.replace(/\+/g, '-') // '+' => '-'
    val = val.replace(/\//g, '_') // '/' => '_'

    return val
}

function hash(value: string) {
    const hash = Sha256.hash(value)
    return base64UrlEncode(hash)
}

function computeSessionStateHash(
    clientId: string,
    origin: string,
    sessionId: string | undefined,
    salt: string
) {
    return hash(clientId + origin + sessionId + salt)
}

export function calculateSessionStateResult(origin: string, message: string) {
    try {
        if (!origin || !message) {
            return 'error'
        }

        const idx = message.lastIndexOf(' ')
        if (idx < 0 || idx >= message.length) {
            return 'error'
        }

        const clientId = message.substring(0, idx)
        const sessionState = message.substring(idx + 1)

        if (!clientId || !sessionState) {
            return 'error'
        }

        const sessionStateParts = sessionState.split('.')
        if (sessionStateParts.length !== 2) {
            return 'error'
        }

        const clientHash = sessionStateParts[0]
        const salt = sessionStateParts[1]
        if (!clientHash || !salt) {
            return 'error'
        }

        const currentSessionId = getBrowserSessionId()
        const expectedHash = computeSessionStateHash(clientId, origin, currentSessionId, salt)
        return clientHash === expectedHash ? 'unchanged' : 'changed'
    } catch (e) {
        console.error(e)
        return 'error'
    }
}
