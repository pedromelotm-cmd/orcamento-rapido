"""Procura fotos CC0 (domínio público, uso comercial livre, sem atribuição) no Openverse, fonte StockSnap,
e descarrega-as para social/fotos/. Regista origem e licença de cada foto em social/fotos/creditos.json.

Uso: python3 social/fotos.py "plumber" "electrician" ...   (sem argumentos usa a lista por defeito)
"""
import json, os, sys, time, urllib.parse, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(AQUI, "fotos")
CREDITOS = os.path.join(PASTA, "creditos.json")
PESQUISAS = ["construction worker", "plumber", "electrician", "painter wall", "renovation", "tools workshop",
             "builder phone", "house renovation", "carpenter", "worker smartphone"]
POR_PESQUISA = 4
UA = {"User-Agent": "orcamento-rapido-social/1.0"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main(pesquisas):
    os.makedirs(PASTA, exist_ok=True)
    creditos = json.load(open(CREDITOS)) if os.path.exists(CREDITOS) else {}
    novas = 0
    for q in pesquisas:
        params = urllib.parse.urlencode({"q": q, "license": "cc0", "source": "stocksnap", "page_size": 12, "mature": "false"})
        for tentativa in range(3):
            try:
                dados = json.loads(get("https://api.openverse.org/v1/images/?" + params))
                break
            except Exception as e:  # limite de pedidos do Openverse: espera e tenta de novo
                print(f"  {q}: {e}; a aguardar")
                time.sleep(20)
        else:
            continue
        guardadas = 0
        for r in dados.get("results", []):
            if guardadas >= POR_PESQUISA:
                break
            if r.get("license") != "cc0" or (r.get("width") or 0) < (r.get("height") or 0) * 0.5:
                continue
            nome = r["id"] + ".jpg"
            destino = os.path.join(PASTA, nome)
            if nome not in creditos:
                try:
                    open(destino, "wb").write(get(r["url"]))
                except Exception as e:
                    print(f"  falhou {r['url']}: {e}")
                    continue
                creditos[nome] = {"pesquisa": q, "titulo": r.get("title"), "licenca": "CC0 1.0",
                                  "fonte": r.get("source"), "pagina": r.get("foreign_landing_url"), "url": r["url"]}
                novas += 1
            guardadas += 1
        print(f"{q}: {guardadas} fotos")
        time.sleep(4)
    json.dump(creditos, open(CREDITOS, "w"), ensure_ascii=False, indent=1)
    print(f"{novas} fotos novas, {len(creditos)} no total")


if __name__ == "__main__":
    main(sys.argv[1:] or PESQUISAS)
