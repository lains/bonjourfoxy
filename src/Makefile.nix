CC = g++

ifeq ($(shell uname -m),x86_64)
    SUFFIX = 64
else
    SUFFIX =
endif

HEADERS = IBFDNSSDService.h
TYPELIB = IBFDNSSDService.xpt IBFServiceTracker.xpt
IMP_OBJS = BFDNSSDService${SUFFIX}.o
MOD_OBJS = BFDNSSDServiceModule${SUFFIX}.o
LIB_OBJS = BFDNSSDService${SUFFIX}.so
ALL_OBJS = ${HEADERS} ${TYPELIB} ${IMP_OBJS} ${MOD_OBJS} ${LIB_OBJS}

XR_EXEC := $(shell find /etc/gre.d/ -type f -print0 | xargs -0 sed -n -e 's/^GRE_PATH=//p' | sort -u | tail -n 1)/xulrunner
GRE_VER := $(shell ${XR_EXEC} --gre-version)

FF_FULL_VER := $(shell firefox --version|cut -d " " -f 3|sed "s/,$$//g")
FF_MAJOR_VER := $(shell echo ${FF_FULL_VER}|cut -d "." -f1,2)
FF_MIN_VER := ${FF_MAJOR_VER}
FF_MAX_VER := ${FF_MAJOR_VER}.*

INSTALL_FILES = /install.rdf \
                /skin/toolbar-button.png \
                /skin/overlay.css \
                /defaults/preferences/defaults.js \
                /locale/en-US/bonjourfoxy.properties \
                /locale/en-US/bonjourfoxy.dtd \
                /locale/en-US/welcome.html \
                /locale/de-DE/bonjourfoxy.properties \
                /locale/de-DE/bonjourfoxy.dtd \
                /locale/en-US/welcome.html \
                /lib/${FF_MAJOR_VER}/BFDNSSDService.so \
                /chrome.manifest \
                /content/list.css \
                /content/options.xul \
                /content/browserOverlay.js \
                /content/browser.xul \
                /content/browser.js \
                /content/browserOverlay.xul \
                /content/status_color.png \
                /content/list.js \
                /content/welcome.css \
                /content/lib.js \
                /content/namespace.js \
                /content/list.xul \
                /content/status_bw.png \
                /content/transparent.gif \
                /content/welcome.js \
                /content/options.js \
                /content/bfdnssdservicetest.html \
                /content/bflogs.html \
                /components/IBFDNSSDService.xpt \
                /components/stub.js \
                /components/BFServiceTracker.js \
                /components/IBFServiceTracker.xpt \

# Lib path
ifeq (exists,$(shell test -d /usr/lib${SUFFIX} && echo exists))
    LIB_PATH := /usr/lib${SUFFIX}
else
    LIB_PATH := /usr/lib
endif

# Destination directory
ifeq (exists,$(shell test -d ${LIB_PATH}/firefox-addons/extensions && echo exists))
    EXTENSION_ID_SUFFIX = firefox-${FF_MAJOR_VER}.bonjourfoxy.net
    EXTENSIONS_PATH = ${LIB_PATH}/firefox-addons/extensions
else ifeq (exists,$(shell test -d ${LIB_PATH}/iceweasel/extensions && echo exists))
    EXTENSION_ID_SUFFIX = iceweasel-${FF_MAJOR_VER}.bonjourfoxy.net
    EXTENSIONS_PATH = ${LIB_PATH}/iceweasel/extensions
else ifeq (exists,$(shell test -d ${LIB_PATH}/firefox-${FF_FULL_VER}/extensions && echo exists))
    EXTENSION_ID_SUFFIX = firefox-${FF_MAJOR_VER}.bonjourfoxy.net
    EXTENSIONS_PATH = ${LIB_PATH}/firefox-${FF_FULL_VER}/extensions
endif
EXTENSION_ID = bonjourfoxy@${EXTENSION_ID_SUFFIX}
EEXTENSION_ID = bonjourfoxy\@${EXTENSION_ID_SUFFIX}
TARGETDIR = ${EXTENSIONS_PATH}/${EXTENSION_ID}

# Avahi includes
AVAHI_INCLUDES = $(shell pkg-config --cflags avahi-compat-libdns_sd)
AVAHI_LIBS = $(shell pkg-config --libs avahi-compat-libdns_sd)

# XR includes
XR_INCLUDES = $(shell pkg-config --cflags libxul libxul-unstable)
XR_LIBS = $(shell pkg-config --libs libxul libxul-unstable)
XR_IDL_PATH = $(shell pkg-config --variable=idldir libxul)
IDL_INCLUDES = -I ${XR_IDL_PATH}/stable -I ${XR_IDL_PATH}/unstable
#xpcom compiler path
XPIDL = $(shell pkg-config --variable=sdkdir libxul-unstable)/bin/xpidl

CFLAGS                = -fPIC
LDFLAGS               = -Wl,-rpath-link,-fshort-wchar

ifeq (src,$(notdir $(CURDIR)))
%.xpt: %.idl
	${XPIDL} -m typelib ${IDL_INCLUDES} $<

%.h: %.idl
	${XPIDL} -m header ${IDL_INCLUDES} $<

BFDNSSDService$(SUFFIX).o: CBFDNSSDService.cpp IBFDNSSDService.h
	${CC} ${CFLAGS} -w -c -o $@ -I . $(XR_INCLUDES) -DXP_UNIX $(AVAHI_INCLUDES) CBFDNSSDService.cpp

BFDNSSDServiceModule$(SUFFIX).o: CBFDNSSDServiceModule.cpp
	${CC} ${CFLAGS} -w -c -o $@ -I . $(XR_INCLUDES) -DXP_UNIX $(AVAHI_INCLUDES) CBFDNSSDServiceModule.cpp

BFDNSSDService$(SUFFIX).so: BFDNSSDService$(SUFFIX).o BFDNSSDServiceModule$(SUFFIX).o
	${CC} -shared -Wl,-z,defs $(AVAHI_LIBS) ${LDFLAGS} -dynamiclib -o $@ $^ $(XR_LIBS)

clean:
	rm -f ${ALL_OBJS}

all: ${ALL_OBJS}

else

all: xpcom dir

check:
	@echo -n XULRunner lib
	@echo -n $(shell pkg-config --exists libxul) && echo \ exists  || (echo \ MISSING && false)
	@echo -n Avahi lib
	@echo -n $(shell pkg-config --exists avahi-compat-libdns_sd) && echo \ exists  || (echo \ MISSING && false)
	@echo -n Extensions folder "${EXTENSIONS_FOLDER}"
	@test -d ${EXTENSIONS_FOLDER} && echo \ exists || (echo \ MISSING && false)

xpcom: check
	make -C src all -f ../Makefile

dir: xpcom
	mkdir -p scratch scratch/lib/${FF_MAJOR_VER}
	cp -r ext/* scratch
	perl -pi -e "s/%%MINVER%%/${FF_MIN_VER}/g" scratch/install.rdf
	perl -pi -e "s/%%MAXVER%%/${FF_MAX_VER}/g" scratch/install.rdf
	perl -pi -e "s/bonjourfoxy\@bonjourfoxy.net/${EEXTENSION_ID}/g" scratch/install.rdf
	perl -pi -e "s/bonjourfoxy\@bonjourfoxy.net/${EEXTENSION_ID}/g" scratch/defaults/preferences/defaults.js
	mkdir -p scratch/components
	cp src/*.xpt src/*.js scratch/components
	cp src/*.so scratch/lib/${FF_MAJOR_VER}
	@echo Extension staged in $(CURDIR)/scratch
	@echo Run make install to install to ${DESTDIR}${TARGETDIR}

install:
	install -d ${DESTDIR}${TARGETDIR}/skin
	install -d ${DESTDIR}${TARGETDIR}/defaults/preferences
	install -d ${DESTDIR}${TARGETDIR}/locale/en-US
	install -d ${DESTDIR}${TARGETDIR}/locale/de-DE
	install -d ${DESTDIR}${TARGETDIR}/lib/${FF_MAJOR_VER}
	install -d ${DESTDIR}${TARGETDIR}/content
	install -d ${DESTDIR}${TARGETDIR}/components
	for file in ${INSTALL_FILES}; do \
        install -m644 scratch$${file} ${DESTDIR}${TARGETDIR}$${file}; \
    done

clean:
	rm -fr scratch/
	make -C src clean -f ../Makefile

endif
