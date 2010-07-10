/* -*- Mode: C; tab-width: 4 -*-
 *
 * Copyright (c) 2009 Apple Computer, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


#ifndef _CBFDNSSDSERVICE_H
#define _CBFDNSSDSERVICE_H

#include "IBFDNSSDService.h"
#include "nsCOMPtr.h"
#include "nsComponentManagerUtils.h"
#include "nsIThread.h"
#include "nsIRunnable.h"
#include "prtpool.h"
#include "nsStringAPI.h"
#include "nsIMutableArray.h"
#include "nsIVariant.h"
#include <dns_sd.h>
#include <stdio.h>
#include <string>


#define CBFDNSSDSERVICE_CONTRACTID "@bonjourfoxy.net/BFDNSSDService;1"
#define CBFDNSSDSERVICE_CLASSNAME "CBFDNSSDService"
#define CBFDNSSDSERVICE_CID { 0xe8e81354, 0x2bf5, 0x41bb, { 0xbc, 0x61, 0x6a, 0xed, 0x6c, 0x88, 0xe0, 0x17 } }

/* Header file */
class CBFDNSSDService : public IBFDNSSDService, nsIRunnable
{
public:
	NS_DECL_ISUPPORTS
	NS_DECL_IBFDNSSDSERVICE
	NS_DECL_NSIRUNNABLE

	CBFDNSSDService();
	CBFDNSSDService( nsISupports * listener );

	virtual ~CBFDNSSDService();
	
private:

	static void DNSSD_API
	EnumerateReply
		(
		DNSServiceRef		sdRef,
		DNSServiceFlags		flags,
		uint32_t			interfaceIndex,
		DNSServiceErrorType	errorCode,
		const char		*	domain,
		void			*	context
		);
		
	static void DNSSD_API
	BrowseReply
		(
		DNSServiceRef		sdRef,
		DNSServiceFlags		flags,
		uint32_t			interfaceIndex,
		DNSServiceErrorType	errorCode,
		const char		*	serviceName,
		const char		*	regtype,
		const char		*	replyDomain,
		void			*	context
		);
		
	static void DNSSD_API
	ResolveReply
		(
		DNSServiceRef			sdRef,
		DNSServiceFlags			flags,
		uint32_t				interfaceIndex,
		DNSServiceErrorType		errorCode,
		const char			*	fullname,
		const char			*	hosttarget,
		uint16_t				port,
		uint16_t				txtLen,
		const unsigned char	*	txtRecord,
		void				*	context
		);
		
	static void DNSSD_API
	RegisterReply
		(
		DNSServiceRef			sdRef,
		DNSServiceFlags			flags,
		DNSServiceErrorType		inErrorCode,
		const char			*	inName, 
		const char			*	inRegType,
		const char			*	inRegDomain,
		void				*	context
		);
		
	static void
	Read
		(
		void * arg
		);
		
	nsresult
	SetupNotifications();
	
	void
	Cleanup();

	PRThreadPool	*	m_threadPool;
	DNSServiceRef		m_sdRef;
	nsISupports		*	m_listener;
	PRFileDesc		*	m_fileDesc;
	PRJobIoDesc			m_iod;
	PRJob			*	m_job;

	nsAutoString		m_svcTxtKey;
	nsAutoString		m_regType;
	PRBool				m_enuDomainType;
	PRBool				m_stopped;
};


#endif
